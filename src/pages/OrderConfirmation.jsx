import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ordersService } from '../services/supabaseService'
import '../styles/OrderConfirmation.css'

export default function OrderConfirmation() {
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
      <div className="order-confirmation-container">
        <div className="loading">Loading order details...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="order-confirmation-container">
        <div className="error">
          <h1>Order Not Found</h1>
          <p>We couldn't find your order. Please contact support if you believe this is an error.</p>
          <button onClick={() => navigate('/')} className="btn-home">
            Return to Store
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="order-confirmation-container">
      <div className="confirmation-header">
        <div className="success-icon">✓</div>
        <h1>Order Confirmed!</h1>
        <p>Thank you for your purchase. Your order has been successfully placed.</p>
      </div>

      <div className="order-details">
        <div className="order-info">
          <h2>Order #{order.id.slice(-8).toUpperCase()}</h2>
          <div className="order-meta">
            <p><strong>Order Date:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
            <p><strong>Status:</strong>
              <span className={`status status-${order.status}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </p>
            <p><strong>Total:</strong> ${order.total_amount.toFixed(2)}</p>
          </div>
        </div>

        <div className="customer-info">
          <h3>Shipping Information</h3>
          <div className="address">
            <p>{order.shipping_address?.name}</p>
            <p>{order.shipping_address?.address}</p>
            <p>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.zipCode}</p>
            <p>{order.shipping_address?.country}</p>
            <p>{order.shipping_address?.email}</p>
          </div>
        </div>

        <div className="order-items">
          <h3>Order Items</h3>
          <div className="items-list">
            {order.order_items?.map(item => (
              <div key={item.id} className="order-item">
                <div className="item-info">
                  {item.products?.image_url && (
                    <img src={item.products.image_url} alt={item.products.name} />
                  )}
                  <div>
                    <p className="item-name">{item.product_name}</p>
                    <p className="item-details">
                      Quantity: {item.quantity} × ${item.product_price.toFixed(2)}
                    </p>
                  </div>
                </div>
                <p className="item-total">${(item.product_price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="order-actions">
          <button onClick={() => navigate('/')} className="btn-continue-shopping">
            Continue Shopping
          </button>
          <button onClick={() => navigate('/orders')} className="btn-view-orders">
            View All Orders
          </button>
        </div>
      </div>
    </div>
  )
}