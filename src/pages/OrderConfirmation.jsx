import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ordersService } from '../services/supabaseService'
import { Button } from '@/components/ui/button'

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
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="py-16 text-center text-slate-500">Loading order details...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="py-16 text-center">
          <h1 className="mb-3 text-2xl font-semibold text-red-600">Order Not Found</h1>
          <p className="mb-6 text-slate-500">We couldn't find your order. Please contact support if you believe this is an error.</p>
          <Button onClick={() => navigate('/')}>
            Return to Store
          </Button>
        </div>
      </div>
    )
  }

  const statusStyles = {
    paid: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-emerald-500 text-2xl text-white">✓</div>
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Order Confirmed!</h1>
        <p className="text-slate-500">Thank you for your purchase. Your order has been successfully placed.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Order #{order.id.slice(-8).toUpperCase()}</h2>
          <div className="space-y-1.5 text-sm text-slate-600">
            <p><strong className="text-slate-900">Order Date:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
            <p><strong className="text-slate-900">Status:</strong>{' '}
              <span className={`ml-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[order.status] || 'bg-slate-100 text-slate-700'}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </p>
            <p><strong className="text-slate-900">Total:</strong> ${order.total_amount.toFixed(2)}</p>
          </div>
        </div>

        <div className="mb-6 border-b border-slate-200 pb-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Shipping Information</h3>
          <div className="space-y-1 text-sm text-slate-600">
            <p>{order.shipping_address?.name}</p>
            <p>{order.shipping_address?.address}</p>
            <p>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.zipCode}</p>
            <p>{order.shipping_address?.country}</p>
            <p>{order.shipping_address?.email}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Order Items</h3>
          <div className="divide-y divide-slate-100">
            {order.order_items?.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <div className="flex items-center gap-4">
                  {item.products?.image_url && (
                    <img className="size-14 rounded-lg object-cover" src={item.products.image_url} alt={item.products.name} />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{item.product_name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Quantity: {item.quantity} × ${item.product_price.toFixed(2)}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-slate-900">${(item.product_price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 border-t border-slate-200 pt-6">
          <Button onClick={() => navigate('/')}>
            Continue Shopping
          </Button>
          <Button variant="outline" onClick={() => navigate('/orders')}>
            View All Orders
          </Button>
        </div>
      </div>
    </div>
  )
}
