import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CircleCheckIcon } from 'lucide-react'
import { ordersService } from '../services/supabaseService'
import { Button } from '@/components/ui/button'
import ProductImage from '@/components/ProductImage'

export default function OrderConfirmationPage() {
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
      <section className="grid min-h-[calc(100vh-4rem)] place-items-center px-4">
        <p className="text-sm text-slate-500">Loading your order…</p>
      </section>
    )
  }

  if (!order) {
    return (
      <section className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 text-center">
        <div>
          <h1 className="mb-3 text-2xl font-semibold text-red-600">Order Not Found</h1>
          <p className="mb-6 text-slate-500">We couldn't find your order. Please contact support if you believe this is an error.</p>
          <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => navigate('/')}>
            Return to Shop
          </Button>
        </div>
      </section>
    )
  }

  const total = Number(order.total_amount ?? 0)

  return (
    <section className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-500 ring-8 ring-emerald-50/50">
          <CircleCheckIcon className="size-12" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Thank you for your order!</h1>
        <p className="mt-3 text-sm text-slate-500">Order #{order.id.slice(-8).toUpperCase()} · placed {new Date(order.created_at).toLocaleDateString()}</p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Order summary</h2>
          <div className="divide-y divide-slate-100">
            {order.order_items?.map((item) => {
              const itemPrice = Number(item.product_price ?? 0)
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                  <div className="flex items-center gap-3">
                    <ProductImage src={item.products?.image_url} alt={item.products?.name || item.product_name} className="size-12 shrink-0 rounded-lg" imgClassName="size-12 rounded-lg object-cover" fallbackClassName="text-[10px]" />
                    <div>
                      <p className="font-medium text-slate-900">{item.product_name}</p>
                      <p className="text-xs text-slate-500">Qty {item.quantity} × ${itemPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-slate-900">${(itemPrice * item.quantity).toFixed(2)}</p>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t-2 border-slate-200 pt-4">
            <span className="text-base font-semibold text-slate-900">Total</span>
            <span className="text-xl font-bold text-slate-900">${total.toFixed(2)}</span>
          </div>
        </div>

        <Button
          className="mt-8 w-full bg-slate-900 text-white hover:bg-slate-800 sm:w-auto"
          size="lg"
          onClick={() => navigate('/')}
        >
          Return to Shop
        </Button>
      </div>
    </section>
  )
}
