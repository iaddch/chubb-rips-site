import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCartStore } from '../store/index'
import { ordersService, orderItemsService } from '../services/supabaseService'
import { supabase } from '../config/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectNative } from '@/components/ui/select-native'

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here')

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const { items, getTotal, clearCart } = useCartStore()

  const [loading, setLoading] = useState(false)
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
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setLoading(true)

    try {
      // Create order in database
      const total = getTotal()
      const orderData = {
        user_id: user?.id,
        user_email: shippingInfo.email,
        user_name: shippingInfo.name,
        total_amount: total,
        status: 'pending',
        shipping_address: shippingInfo
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

      // Create payment intent (you'll need a backend endpoint for this)
      // For now, we'll simulate the payment
      const cardElement = elements.getElement(CardElement)

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
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
      })

      if (error) {
        throw error
      }

      // Simulate payment success (replace with actual payment processing)
      await ordersService.updateStatus(order.id, 'paid', paymentMethod.id)

      // Clear cart and redirect to thank-you page
      clearCart()
      navigate('/thank-you', { state: { orderId: order.id } })

    } catch (error) {
      console.error('Payment failed:', error)
      alert('Payment failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const total = getTotal()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-slate-900">Checkout</h1>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Order Summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Order Summary</h2>
          <div className="divide-y divide-slate-200">
            {items.map(item => (
              <div key={item.product_id} className="flex items-center justify-between gap-4 py-4 first:pt-0">
                <div className="flex items-center gap-4">
                  {item.product?.image_url && (
                    <img className="size-14 rounded-lg object-cover" src={item.product.image_url} alt={item.product.name} />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{item.product?.name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{item.product?.set_name}</p>
                    <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                  </div>
                </div>
                <p className="font-semibold text-slate-900">${(item.product?.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
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
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!stripe || loading}
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

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart')
    }
  }, [items, navigate])

  if (items.length === 0) {
    return null
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  )
}
