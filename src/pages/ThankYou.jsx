import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ordersService } from '../services/supabaseService'
import '../styles/ThankYou.css'

export default function ThankYou() {
  const location = useLocation()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const orderId = location.state?.orderId

  useEffect(() => {
    if (!orderId) {
      navigate('/')
      return
    }

    const fetchOrder = async () => {
      try {
        const orderData = await ordersService.getById(orderId)
        setOrder(orderData)
      } catch (error) {
        console.error('Error fetching order:', error)
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, navigate])

  if (loading) {
    return (
      <div className="thank-you-page">
        <div className="thank-you-loading">Loading your order...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="thank-you-page">
        <div className="thank-you-error">
          <h1>Order Not Found</h1>
          <p>We couldn't find your order. Please return to the store and try again.</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Continue Shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="thank-you-page">
      <div className="thank-you-card">
        <div className="thank-you-icon">🎉</div>
        <h1>Thank you for your purchase!</h1>
        <p>Your payment was successful and your order is now being processed.</p>

        <div className="thank-you-summary">
          <p>
            <strong>Order Number:</strong> {order.id.slice(-8).toUpperCase()}
          </p>
          <p>
            <strong>Total Paid:</strong> ${order.total_amount.toFixed(2)}
          </p>
          <p>
            <strong>Shipping To:</strong> {order.shipping_address?.city}, {order.shipping_address?.state}
          </p>
        </div>

        <div className="thank-you-actions">
          <button onClick={() => navigate('/')} className="btn-primary">
            Continue Shopping
          </button>
          <button
            onClick={() => navigate('/order-confirmation', { state: { orderId: order.id } })}
            className="btn-secondary"
          >
            View Order Details
          </button>
        </div>
      </div>
    </div>
  )
}
