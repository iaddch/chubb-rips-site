// Minimal Stripe REST helpers. We call the HTTP API directly with fetch
// instead of pulling in the stripe npm package - it's a thin wrapper over
// a form-encoded POST plus a webhook signature check, and doing it by hand
// keeps the worker bundle small and avoids relying on the SDK's Node-shaped
// internals inside the Workers runtime.

const STRIPE_API = 'https://api.stripe.com/v1'

export async function createPaymentIntent(secretKey, { amountCents, currency, orderId }) {
  const body = new URLSearchParams({
    amount: String(amountCents),
    currency,
    'metadata[order_id]': orderId,
    'automatic_payment_methods[enabled]': 'true',
  })

  const res = await fetch(`${STRIPE_API}/payment_intents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Stripe request failed')
  }
  return data
}

// Verifies a Stripe webhook signature per Stripe's documented scheme:
// https://docs.stripe.com/webhooks#verify-manually
// signed payload = "{timestamp}.{raw body}", HMAC-SHA256 with the webhook
// secret, compared against the v1 signature(s) in the Stripe-Signature
// header. Rejects stale timestamps to block replay of a captured request.
export async function verifyStripeSignature(payload, signatureHeader, webhookSecret, toleranceSeconds = 300) {
  if (!signatureHeader) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=')
      return [key, value]
    })
  )
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > toleranceSeconds) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signedPayload = `${timestamp}.${payload}`
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')

  return timingSafeEqual(expected, signature)
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}
