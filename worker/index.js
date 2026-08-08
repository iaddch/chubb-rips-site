import { createPaymentIntent, verifyStripeSignature } from './stripe.js'
import { getCheckoutsEnabled, getOwnOrder, getOwnOrderItems, getProductPrices, markOrderPaid } from './supabase.js'
import { getShippingRates, getRateById } from './shipping.js'
import { getTaxForAddress } from './tax.js'

// This worker only ever handles the API endpoints below. Every other
// request (the whole SPA) falls straight through to static assets.
// The payment endpoints exist specifically so the "was this order
// actually paid" decision never has to be trusted from the browser:
//  - the amount charged is recomputed here from the live products table,
//    so a tampered client-side price can't reach Stripe
//  - the order is only ever marked "paid" from the webhook below, after
//    Stripe's signature is verified - the client can't set that itself
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/shipping-quote' && request.method === 'POST') {
      return handleShippingQuote(request, env)
    }

    if (url.pathname === '/api/create-payment-intent' && request.method === 'POST') {
      return handleCreatePaymentIntent(request, env)
    }

    if (url.pathname === '/api/stripe-webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env)
    }

    return env.ASSETS.fetch(request)
  },
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Unauthenticated on purpose: it only reads public product prices (same
// data already shown in the storefront) and returns a rate/tax estimate -
// nothing here reads or writes anything user-specific. The real charge is
// still only ever computed from scratch in handleCreatePaymentIntent below.
async function handleShippingQuote(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const items = Array.isArray(body.items) ? body.items : []
  const address = body.address || {}
  if (items.length === 0) {
    return json({ error: 'No items to quote' }, 400)
  }
  if (!address.zipCode || !address.state) {
    return json({ error: 'A destination state and ZIP/postal code are required' }, 400)
  }

  const supabaseUrl = env.SUPABASE_URL
  const anonKey = env.SUPABASE_ANON_KEY

  try {
    const prices = await getProductPrices(supabaseUrl, anonKey, items.map((item) => item.product_id))
    const subtotal = items.reduce((sum, item) => {
      const price = prices[item.product_id]
      if (price === undefined) return sum
      return sum + price * item.quantity
    }, 0)
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

    const options = await getShippingRates({ env, destination: address, totalQuantity })
    if (options.length === 0) {
      return json({ error: 'No shipping rates are available for this address' }, 422)
    }
    const tax = getTaxForAddress({ subtotal, destination: address })

    return json({ subtotal, options, tax })
  } catch (err) {
    console.error('shipping-quote error:', err)
    return json({ error: 'Could not calculate shipping and tax' }, 500)
  }
}

async function handleCreatePaymentIntent(request, env) {
  const authHeader = request.headers.get('Authorization') || ''
  const accessToken = authHeader.replace(/^Bearer\s+/i, '')
  if (!accessToken) {
    return json({ error: 'Not authenticated' }, 401)
  }

  let orderId
  try {
    ;({ orderId } = await request.json())
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!orderId) {
    return json({ error: 'orderId is required' }, 400)
  }

  const supabaseUrl = env.SUPABASE_URL
  const anonKey = env.SUPABASE_ANON_KEY

  try {
    const checkoutsEnabled = await getCheckoutsEnabled(supabaseUrl, anonKey)
    if (!checkoutsEnabled) {
      return json({ error: 'Checkout is currently unavailable' }, 403)
    }

    // Reading through the caller's own access token means RLS returns
    // nothing at all if this order doesn't belong to them.
    const order = await getOwnOrder(supabaseUrl, anonKey, accessToken, orderId)
    if (!order) {
      return json({ error: 'Order not found' }, 404)
    }
    if (order.status !== 'pending') {
      return json({ error: 'Order already processed' }, 409)
    }

    const items = await getOwnOrderItems(supabaseUrl, anonKey, accessToken, orderId)
    if (items.length === 0) {
      return json({ error: 'Order has no items' }, 400)
    }

    const prices = await getProductPrices(supabaseUrl, anonKey, items.map((item) => item.product_id))
    const subtotal = items.reduce((sum, item) => {
      const price = prices[item.product_id]
      if (price === undefined) throw new Error(`Unknown product ${item.product_id}`)
      return sum + price * item.quantity
    }, 0)

    // Shipping cost and tax are never trusted from the client. Tax is
    // re-derived here the same way subtotal is re-derived from live
    // product prices above. Shipping is re-verified by asking Shippo for
    // the exact rate object the customer picked (by id) rather than
    // trusting its dollar amount or re-running a fresh rate search that
    // could legitimately come back different.
    const address = order.shipping_address || {}
    const shippingRate = await getRateById(env, address.shipping_method)
    if (!shippingRate) {
      return json({ error: 'Selected shipping rate is no longer valid - please recalculate shipping' }, 400)
    }
    const tax = getTaxForAddress({ subtotal, destination: address })

    const total = subtotal + shippingRate.amount + tax.amount
    const amountCents = Math.round(total * 100)
    if (amountCents <= 0) {
      return json({ error: 'Order total must be greater than zero' }, 400)
    }

    const paymentIntent = await createPaymentIntent(env.STRIPE_SECRET_KEY, {
      amountCents,
      currency: 'usd',
      orderId,
    })

    return json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('create-payment-intent error:', err)
    return json({ error: 'Could not start payment' }, 500)
  }
}

async function handleStripeWebhook(request, env) {
  const signature = request.headers.get('Stripe-Signature')
  const payload = await request.text()

  const valid = await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET)
  if (!valid) {
    return json({ error: 'Invalid signature' }, 400)
  }

  let event
  try {
    event = JSON.parse(payload)
  } catch {
    return json({ error: 'Invalid payload' }, 400)
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    const orderId = paymentIntent.metadata?.order_id
    if (orderId) {
      try {
        await markOrderPaid(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, orderId, paymentIntent.id)
      } catch (err) {
        console.error('Failed to mark order paid:', err)
        return json({ error: 'Failed to record payment' }, 500)
      }
    }
  }

  return json({ received: true })
}
