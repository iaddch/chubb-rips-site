import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCartStore, useSiteSettingsStore } from '../store/index'
import { ordersService, orderItemsService } from '../services/supabaseService'
import { fetchShippingQuote } from '../services/shippingService'
import { supabase } from '../config/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectNative } from '@/components/ui/select-native'
import { Spinner } from '@/components/ui/spinner'
import { toastManager } from '@/components/ui/toast'
import ProductImage from '@/components/ProductImage'
import ShippingOptions from '@/components/checkout/ShippingOptions'

// A ZIP/postal code this short couldn't possibly resolve to a real rate,
// so there's no point firing a quote request for it yet.
const isPostalCodeQuotable = (zipCode) => zipCode.trim().length >= 3

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here')

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const { items, getTotal, clearCart } = useCartStore()

  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [user, setUser] = useState(null)
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  })

  // Real-time shipping/tax quote from /api/shipping-quote, and which of
  // its options the customer picked. Reset to null whenever the address
  // or cart contents change enough to invalidate the previous quote.
  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState(null)
  const [selectedShippingId, setSelectedShippingId] = useState(null)
  const debounceRef = useRef(null)

  const addressReadyForQuote = Boolean(shippingInfo.state.trim()) && isPostalCodeQuotable(shippingInfo.zipCode)

  const runQuote = useCallback(async () => {
    if (items.length === 0) return
    setQuoteLoading(true)
    setQuoteError(null)
    try {
      const result = await fetchShippingQuote({
        items,
        address: {
          name: shippingInfo.name,
          street: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zipCode: shippingInfo.zipCode,
          country: shippingInfo.country,
        },
      })
      setQuote(result)
      setSelectedShippingId((prev) =>
        prev && result.options.some((option) => option.id === prev) ? prev : result.options[0]?.id ?? null
      )
    } catch (error) {
      setQuote(null)
      setSelectedShippingId(null)
      setQuoteError(error.message || 'Could not calculate shipping and tax')
    } finally {
      setQuoteLoading(false)
    }
  }, [items, shippingInfo])

  // Auto-trigger once the address is complete enough to quote, debounced
  // so quick typing (or item quantity changes) doesn't fire a request per
  // keystroke. Also re-fires if the cart contents change, since a
  // different subtotal can flip the free-shipping threshold or tax amount.
  useEffect(() => {
    if (!addressReadyForQuote) return undefined

    debounceRef.current = setTimeout(() => {
      runQuote()
    }, 500)

    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressReadyForQuote, shippingInfo.state, shippingInfo.zipCode, shippingInfo.country, items])

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        // Redirect to login if not authenticated
        navigate('/login')
        return
      }
      setUser(user)
      setShippingInfo(prev => ({
        ...prev,
        email: user.email || '',
        name: user.user_metadata?.full_name || ''
      }))
    }
    getUser()
  }, [navigate])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setShippingInfo(prev => ({
      ...prev,
      [name]: value
    }))

    // Any edit to the destination invalidates the last quote - clear it so
    // stale rates/tax can't linger while the debounced re-fetch catches up.
    if (name === 'zipCode' || name === 'state' || name === 'country') {
      setQuote(null)
      setSelectedShippingId(null)
      setQuoteError(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) return

    if (!quote || !selectedShippingId) {
      setSubmitError('Please enter your shipping address and select a shipping method before paying.')
      return
    }

    setLoading(true)
    setSubmitError(null)

    try {
      // Create order in database. total_amount here is only ever a display
      // value - the amount actually charged is recomputed server-side from
      // the live product prices plus the shipping method/tax re-derived
      // from this same address, so a tampered client-side total can't
      // change what Stripe bills.
      const subtotal = getTotal()
      const shippingOption = quote.options.find((option) => option.id === selectedShippingId)
      const total = subtotal + (shippingOption?.amount || 0) + (quote.tax?.amount || 0)
      const orderData = {
        user_id: user?.id,
        user_email: shippingInfo.email,
        user_name: shippingInfo.name,
        total_amount: total,
        status: 'pending',
        shipping_address: { ...shippingInfo, shipping_method: selectedShippingId }
      }

      const order = await ordersService.create(orderData)

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity
      }))

      await orderItemsService.createBulk(orderItems)

      // Ask the worker to start a real Stripe PaymentIntent for this
      // order. It re-derives the amount from the products table itself.
      const { data: { session } } = await supabase.auth.getSession()
      const intentRes = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      })
      const intentData = await intentRes.json()
      if (!intentRes.ok) {
        throw new Error(intentData.error || 'Could not start payment')
      }

      const cardElement = elements.getElement(CardElement)

      // This actually charges the card. The order is only ever marked
      // "paid" by the Stripe webhook once it verifies the charge really
      // went through - never by this client-side call.
      const { error, paymentIntent } = await stripe.confirmCardPayment(intentData.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: shippingInfo.name,
            email: shippingInfo.email,
            address: {
              line1: shippingInfo.address,
              city: shippingInfo.city,
              state: shippingInfo.state,
              postal_code: shippingInfo.zipCode,
              country: shippingInfo.country
            }
          }
        }
      })

      if (error) {
        throw error
      }
      if (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'processing') {
        throw new Error('Payment was not completed. Please try again.')
      }

      // Clear cart and redirect to the order confirmation page
      clearCart()
      toastManager.add({
        title: 'Payment successful',
        description: 'Your order has been placed.',
        type: 'success',
      })
      navigate('/order-confirmation', { state: { orderId: order.id } })

    } catch (error) {
      console.error('Payment failed:', error)
      const message = error.message || 'Payment failed. Please check your details and try again.'
      setSubmitError(message)
      toastManager.add({
        title: 'Payment failed',
        description: message,
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const subtotal = getTotal()
  const selectedShippingOption = quote?.options.find((option) => option.id === selectedShippingId) || null
  const shippingAmount = selectedShippingOption?.amount ?? null
  const taxAmount = quote?.tax?.amount ?? null
  const total = subtotal + (shippingAmount || 0) + (taxAmount || 0)
  const readyToPay = Boolean(quote && selectedShippingId) && !quoteLoading

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-slate-900">Checkout</h1>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Order Summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Order Summary</h2>
          <div className="divide-y divide-slate-200">
            {items.map(item => {
              const price = Number(item.product?.price ?? 0)
              return (
                <div key={item.product_id} className="flex items-center justify-between gap-4 py-4 first:pt-0">
                  <div className="flex items-center gap-4">
                    <ProductImage src={item.product?.image_url} alt={item.product?.name} className="size-14 shrink-0 rounded-lg" imgClassName="size-14 rounded-lg object-cover" fallbackClassName="text-[10px]" />
                    <div>
                      <p className="font-semibold text-slate-900">{item.product?.name || 'Unknown product'}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{item.product?.set_name}</p>
                      <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-slate-900">${(price * item.quantity).toFixed(2)}</p>
                </div>
              )
            })}
          </div>
          <div className="mt-2 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Estimated Shipping</span>
              {quoteLoading ? (
                <Spinner className="size-4" />
              ) : (
                <span className="font-medium text-slate-900">
                  {shippingAmount === null ? 'Calculated at next step' : shippingAmount === 0 ? 'Free' : `$${shippingAmount.toFixed(2)}`}
                </span>
              )}
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Estimated Sales Tax</span>
              {quoteLoading ? (
                <Spinner className="size-4" />
              ) : (
                <span className="font-medium text-slate-900">
                  {taxAmount === null ? 'Calculated at next step' : `$${taxAmount.toFixed(2)}`}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 border-t-2 border-slate-200 pt-4 text-right">
            <p className="text-lg font-bold text-slate-900">Total: ${total.toFixed(2)}</p>
          </div>
        </div>

        {/* Payment Form */}
        <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
          <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold text-slate-900">Shipping Information</h2>

          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              type="text"
              id="name"
              name="name"
              maxLength={100}
              value={shippingInfo.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              name="email"
              maxLength={254}
              value={shippingInfo.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input
              type="text"
              id="address"
              name="address"
              maxLength={200}
              value={shippingInfo.address}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                type="text"
                id="city"
                name="city"
                maxLength={100}
                value={shippingInfo.city}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input
                type="text"
                id="state"
                name="state"
                maxLength={50}
                value={shippingInfo.state}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                type="text"
                id="zipCode"
                name="zipCode"
                maxLength={20}
                value={shippingInfo.zipCode}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <SelectNative
                id="country"
                name="country"
                value={shippingInfo.country}
                onChange={handleInputChange}
                required
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </SelectNative>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between gap-4">
              <Label>Shipping Method</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runQuote}
                disabled={!addressReadyForQuote || quoteLoading}
              >
                Calculate Shipping &amp; Taxes
              </Button>
            </div>
            <ShippingOptions
              options={quote?.options ?? null}
              selectedId={selectedShippingId}
              onSelect={setSelectedShippingId}
              loading={quoteLoading}
              error={quoteError}
            />
          </div>

          <h2 className="border-b border-slate-200 pb-2 pt-2 text-lg font-semibold text-slate-900">Payment Information</h2>

          <div className="space-y-1.5">
            <Label>Card Details</Label>
            <div className="rounded-md border border-input px-3 py-2.5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                }}
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              Payments are processed securely by Stripe. We never see or store your card details.
            </p>
          </div>

          {submitError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{submitError}</div>
          ) : null}

          {!readyToPay ? (
            <p className="text-center text-xs text-slate-500">Select a shipping method above to unlock payment.</p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!stripe || loading || !readyToPay}
          >
            {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function Checkout() {
  const navigate = useNavigate()
  const { items } = useCartStore()
  const checkoutsEnabled = useSiteSettingsStore((state) => state.checkoutsEnabled)

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart')
    }
  }, [items, navigate])

  if (items.length === 0) {
    return null
  }

  if (!checkoutsEnabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800" role="alert">
          We apologize, but checkout is currently unavailable. Please check back later or contact us on Instagram for direct inquiries.
        </div>
        <Button variant="outline" className="mt-6" onClick={() => navigate('/cart')}>← Back to cart</Button>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  )
}
