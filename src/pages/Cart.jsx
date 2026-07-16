import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function Cart() {
  const navigate = useNavigate()
  const { items, removeItem, updateItemQuantity, getTotal, clearCart } = useCartStore()

  if (items.length === 0) {
    return (
      <section className="grid min-h-[calc(100vh-4rem)] place-items-center bg-slate-50 px-4 py-12">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-xl text-emerald-600">⌾</div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Your cart is waiting</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Add something from the vault and it will appear here.</p>
          <Button className="mt-6" onClick={() => navigate('/')}>Browse products</Button>
        </div>
      </section>
    )
  }

  const total = getTotal()

  return (
    <section className="min-h-full bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-indigo-600">CHUBB&apos;S VAULT</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Your cart</h1>
            <p className="mt-2 text-sm text-slate-500">{items.length} item{items.length === 1 ? '' : 's'} selected</p>
          </div>
          <Button variant="ghost" className="text-slate-500" onClick={() => navigate('/')}>← Continue shopping</Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
            <Table className="min-w-[680px]">
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6">Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="px-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell className="px-6 py-4">
                      <div className="flex min-w-56 items-center gap-4">
                        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                          {item.product?.image_url ? <img className="size-full object-contain p-1" src={item.product.image_url} alt={item.product.name} /> : null}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{item.product?.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.product?.set_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">${item.product?.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="icon" aria-label="Decrease quantity" onClick={() => updateItemQuantity(item.product_id, Math.max(1, item.quantity - 1))}>−</Button>
                        <Input className="w-14 text-center" type="number" min="1" max={item.product?.stock_quantity || 1} value={item.quantity} onChange={(e) => updateItemQuantity(item.product_id, parseInt(e.target.value) || 1)} />
                        <Button variant="outline" size="icon" aria-label="Increase quantity" onClick={() => updateItemQuantity(item.product_id, Math.min(item.product?.stock_quantity || 1, item.quantity + 1))}>+</Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">${(item.product?.price * item.quantity).toFixed(2)}</TableCell>
                    <TableCell className="px-6 text-right"><Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeItem(item.product_id)}>Remove</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
            <div className="mt-5 space-y-3 border-b border-slate-100 pb-5 text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="font-medium text-slate-900">${total.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Shipping</span><span>Calculated at checkout</span></div>
            </div>
            <div className="flex items-baseline justify-between py-5"><span className="font-semibold text-slate-900">Estimated total</span><span className="text-2xl font-semibold tracking-tight text-slate-900">${total.toFixed(2)}</span></div>
            <Button className="w-full" onClick={() => navigate('/checkout')}>Proceed to checkout</Button>
            <Button variant="outline" className="mt-3 w-full" onClick={() => navigate('/')}>Keep shopping</Button>
            <Button variant="ghost" className="mt-3 w-full text-slate-500 hover:text-red-600" onClick={() => { if (window.confirm('Clear all items from cart?')) clearCart() }}>Clear cart</Button>
          </aside>
        </div>
      </div>
    </section>
  )
}
