import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore, useSiteSettingsStore } from '../store/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import ProductImage from '@/components/ProductImage'

export default function Cart() {
  const navigate = useNavigate()
  const { items, removeItem, updateItemQuantity, getTotal, clearCart } = useCartStore()
  const checkoutsEnabled = useSiteSettingsStore((state) => state.checkoutsEnabled)

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
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Your cart</h1>
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
                {items.map((item) => {
                  const price = Number(item.product?.price ?? 0)
                  const stockLimit = item.product?.stock_quantity > 0 ? item.product.stock_quantity : 1
                  const clampQuantity = (value) => Math.min(stockLimit, Math.max(1, value))
                  return (
                    <TableRow key={item.product_id}>
                      <TableCell className="px-6 py-4">
                        <div className="flex min-w-56 items-center gap-4">
                          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                            <ProductImage src={item.product?.image_url} alt={item.product?.name} className="size-full" imgClassName="size-full object-contain p-1" fallbackClassName="text-[10px]" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{item.product?.name || 'Unknown product'}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.product?.set_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">${price.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="icon" aria-label="Decrease quantity" onClick={() => updateItemQuantity(item.product_id, clampQuantity(item.quantity - 1))}>−</Button>
                          <Input className="w-14 text-center" type="number" min="1" max={stockLimit} value={item.quantity} onChange={(e) => updateItemQuantity(item.product_id, clampQuantity(parseInt(e.target.value, 10) || 1))} />
                          <Button variant="outline" size="icon" aria-label="Increase quantity" onClick={() => updateItemQuantity(item.product_id, clampQuantity(item.quantity + 1))}>+</Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">${(price * item.quantity).toFixed(2)}</TableCell>
                      <TableCell className="px-6 text-right"><Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeItem(item.product_id)}>Remove</Button></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
            <div className="mt-5 space-y-3 border-b border-slate-100 pb-5 text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="font-medium text-slate-900">${total.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Shipping</span><span className="font-medium text-slate-500">Calculated at next step</span></div>
              <div className="flex justify-between text-slate-500"><span>Estimated Sales Tax</span><span className="font-medium text-slate-500">Calculated at next step</span></div>
            </div>
            <div className="flex items-baseline justify-between py-5"><span className="font-semibold text-slate-900">Estimated total</span><span className="text-2xl font-semibold tracking-tight text-slate-900">${total.toFixed(2)}</span></div>
            {!checkoutsEnabled ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800" role="alert">
                We apologize, but checkout is currently unavailable. Please check back later or contact us on Instagram for direct inquiries.
              </div>
            ) : null}
            <div className={!checkoutsEnabled ? 'cursor-not-allowed' : undefined}>
              <Button
                className="w-full disabled:opacity-40"
                onClick={() => navigate('/checkout')}
                disabled={!checkoutsEnabled}
              >
                Proceed to checkout
              </Button>
            </div>
            <Button variant="outline" className="mt-3 w-full" onClick={() => navigate('/')}>Keep shopping</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="mt-3 w-full text-slate-500 hover:text-red-600">Clear cart</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all items from cart?</AlertDialogTitle>
                  <AlertDialogDescription>This removes every item currently in your cart. You&apos;ll need to add them again to check out.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={clearCart}>Clear cart</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </aside>
        </div>
      </div>
    </section>
  )
}
