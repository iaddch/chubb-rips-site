import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCartStore } from '../store/index'
import { ordersService, orderItemsService } from '../services/supabaseService'
import { supabase } from '../config/supabase'
import '../styles/Checkout.css'

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
    <div className="checkout-container">
      <h1>Checkout</h1>

      <div className="checkout-layout">
        {/* Order Summary */}
        <div className="order-summary">
          <h2>Order Summary</h2>
          <div className="order-items">
            {items.map(item => (
              <div key={item.product_id} className="order-item">
                <div className="item-info">
                  {item.product?.image_url && (
                    <img src={item.product.image_url} alt={item.product.name} />
                  )}
                  <div>
                    <p className="item-name">{item.product?.name}</p>
                    <p className="item-set">{item.product?.set_name}</p>
                    <p className="item-qty">Qty: {item.quantity}</p>
                  </div>
                </div>
                <p className="item-price">${(item.product?.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="order-total">
            <p>Total: ${total.toFixed(2)}</p>
          </div>
        </div>

        {/* Payment Form */}
        <form className="payment-form" onSubmit={handleSubmit}>
          <h2>Shipping Information</h2>

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={shippingInfo.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={shippingInfo.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={shippingInfo.address}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={shippingInfo.city}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="state">State</label>
              <input
                type="text"
                id="state"
                name="state"
                value={shippingInfo.state}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="zipCode">ZIP Code</label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={shippingInfo.zipCode}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="country">Country</label>
              <select
                id="country"
                name="country"
                value={shippingInfo.country}
                onChange={handleInputChange}
                required
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </div>
          </div>

          <h2>Payment Information</h2>

          <div className="form-group">
            <label>Card Details</label>
            <div className="card-element-container">
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

          <button
            type="submit"
            className="btn-payment"
            disabled={!stripe || loading}
          >
            {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
          </button>
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