import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ordersService } from '../services/supabaseService'
import { Button } from '@/components/ui/button'

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
      <div className="grid min-h-[calc(100vh-180px)] place-items-center p-8">
        <div className="text-slate-500">Loading your order...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="grid min-h-[calc(100vh-180px)] place-items-center p-8">
        <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="mb-2 text-2xl font-semibold text-slate-900">Order Not Found</h1>
          <p className="mb-6 text-slate-500">We couldn't find your order. Please return to the store and try again.</p>
          <Button onClick={() => navigate('/')}>
            Continue Shopping
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-[calc(100vh-180px)] place-items-center p-8">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mb-4 text-5xl">🎉</div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Thank you for your purchase!</h1>
        <p className="mt-3 leading-7 text-slate-500">Your payment was successful and your order is now being processed.</p>

        <div className="my-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left text-sm">
          <p>
            <strong className="text-slate-900">Order Number:</strong> <span className="text-slate-600">{order.id.slice(-8).toUpperCase()}</span>
          </p>
          <p>
            <strong className="text-slate-900">Total Paid:</strong> <span className="text-slate-600">${order.total_amount.toFixed(2)}</span>
          </p>
          <p>
            <strong className="text-slate-900">Shipping To:</strong> <span className="text-slate-600">{order.shipping_address?.city}, {order.shipping_address?.state}</span>
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => navigate('/')}>
            Continue Shopping
          </Button>
          <Button variant="secondary"
            onClick={() => navigate('/order-confirmation', { state: { orderId: order.id } })}
          >
            View Order Details
          </Button>
        </div>
      </div>
    </div>
  )
}
