import React, { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from '../config/supabase'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectNative } from '@/components/ui/select-native'

const initialForm = () => ({
  name: '',
  type: 'Card',
  qty: '',
  price_bought_at: '',
})

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState([])
  const [activeTab, setActiveTab] = useState('Cards')
  const [sortOption, setSortOption] = useState('name-asc')
  const [form, setForm] = useState(initialForm())
  const [editingItemId, setEditingItemId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchInventory = async () => {
    const { data, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .order('name', { ascending: true })

    if (!inventoryError) {
      setInventoryItems(data || [])
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const filteredInventory = useMemo(() => {
    const expectedType = activeTab === 'Cards' ? 'Card' : 'Sealed Product'
    return inventoryItems.filter((item) => item.type === expectedType)
  }, [activeTab, inventoryItems])

  const sortedInventory = useMemo(() => {
    const sorted = [...filteredInventory]

    switch (sortOption) {
      case 'name-desc':
        return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
      case 'price-low':
        return sorted.sort((a, b) => Number(a.price_bought_at || 0) - Number(b.price_bought_at || 0))
      case 'price-high':
        return sorted.sort((a, b) => Number(b.price_bought_at || 0) - Number(a.price_bought_at || 0))
      case 'name-asc':
      default:
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
  }, [filteredInventory, sortOption])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const itemValues = {
      name: form.name,
      type: form.type,
      qty: Number(form.qty),
      price_bought_at: Number(form.price_bought_at),
    }

    const { error: saveError } = editingItemId
      ? await supabase.from('inventory').update(itemValues).eq('id', editingItemId)
      : await supabase.from('inventory').insert(itemValues)

    setLoading(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setSuccess(editingItemId ? 'Inventory item updated successfully.' : 'Inventory item added successfully.')
    setForm(initialForm())
    setEditingItemId(null)
    fetchInventory()
  }

  const handleEdit = (item) => {
    setForm({
      name: item.name || '',
      type: item.type || 'Card',
      qty: String(item.qty ?? ''),
      price_bought_at: String(item.price_bought_at ?? ''),
    })
    setEditingItemId(item.id)
    setError('')
    setSuccess('')
  }

  const cancelEdit = () => {
    setForm(initialForm())
    setEditingItemId(null)
    setError('')
  }

  const pieData = useMemo(() => {
    const cardsQty = inventoryItems.filter((item) => item.type === 'Card').reduce((sum, item) => sum + Number(item.qty || 0), 0)
    const sealedQty = inventoryItems.filter((item) => item.type === 'Sealed Product').reduce((sum, item) => sum + Number(item.qty || 0), 0)

    return [
      { name: 'Cards', value: cardsQty, color: '#4f46e5' },
      { name: 'Sealed Product', value: sealedQty, color: '#10b981' },
    ].filter((entry) => entry.value > 0)
  }, [inventoryItems])

  const totalQuantity = useMemo(() => inventoryItems.reduce((sum, item) => sum + Number(item.qty || 0), 0), [inventoryItems])
  const totalInventoryValue = useMemo(() => inventoryItems.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price_bought_at || 0), 0), [inventoryItems])

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-5 text-white shadow-sm sm:px-8">
        <div className="absolute -right-12 -top-20 size-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-28 right-40 size-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold tracking-wide text-emerald-400">COLLECTION MANAGER</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Inventory</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">Manage the cards and sealed products that power Chubb&apos;s Vault.</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-white/15 overflow-hidden rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm">
            <div className="px-5 py-3">
              <strong className="block text-xl font-semibold">{totalQuantity}</strong>
              <span className="text-xs text-slate-300">items in stock</span>
            </div>
            <div className="px-5 py-3">
              <strong className="block text-xl font-semibold">${totalInventoryValue.toFixed(0)}</strong>
              <span className="text-xs text-slate-300">inventory value</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="mb-5">
            <p className="text-xs font-bold tracking-[0.16em] text-indigo-600">INVENTORY FORM</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{editingItemId ? 'Edit Inventory Item' : 'Add Inventory Item'}</h3>
            <p className="mt-1 text-sm text-slate-500">Add an item to keep your stock figures current.</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <Label className="mb-1.5 block text-slate-900" htmlFor="inventory-name">Product Name</Label>
                <Input
                  id="inventory-name"
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  placeholder="e.g. Charizard ex Obsidian Flames"
                  required
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-slate-900" htmlFor="inventory-type">Type</Label>
                <SelectNative
                  id="inventory-type"
                  value={form.type}
                  onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}
                >
                  <option value="Card">Card</option>
                  <option value="Sealed Product">Sealed Product</option>
                </SelectNative>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <Label className="mb-1.5 block text-slate-900" htmlFor="inventory-qty">Current Qty</Label>
                <Input
                  id="inventory-qty"
                  type="number"
                  min="0"
                  value={form.qty}
                  onChange={(e) => setForm((current) => ({ ...current, qty: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-slate-900" htmlFor="inventory-price">Price Bought At</Label>
                <Input
                  id="inventory-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price_bought_at}
                  onChange={(e) => setForm((current) => ({ ...current, price_bought_at: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? (editingItemId ? 'Updating...' : 'Adding...') : (editingItemId ? 'Update Item' : 'Add Item')}
              </Button>
              {editingItemId ? (
                <Button variant="outline" type="button" onClick={cancelEdit}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
          {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</div> : null}
          {success ? <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{success}</div> : null}
        </div>

        <div className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-xs font-bold tracking-[0.16em] text-indigo-600">CATALOG</p><h3 className="mt-1 text-lg font-bold text-slate-900">Stock list</h3></div>
            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList aria-label="Inventory categories">
                  <TabsTrigger value="Cards" className="text-xs data-[state=active]:text-indigo-600">Cards</TabsTrigger>
                  <TabsTrigger value="Sealed Product" className="text-xs data-[state=active]:text-indigo-600">Sealed product</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <Label htmlFor="inventory-sort" className="text-xs text-slate-500 whitespace-nowrap">Sort by</Label>
                <SelectNative
                  id="inventory-sort"
                  className="h-8 text-xs"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="name-asc">Alphabetical (A–Z)</option>
                  <option value="name-desc">Alphabetical (Z–A)</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </SelectNative>
              </div>
            </div>
          </div>

          <div className="w-full max-w-full overflow-x-hidden">
            <Table className="w-full table-fixed text-left text-sm">
              <TableHeader className="bg-slate-900 text-xs font-medium uppercase tracking-wide text-white">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%] px-5 py-3">Product Name</TableHead>
                  <TableHead className="w-[20%] px-5 py-3">Current Qty</TableHead>
                  <TableHead className="w-[20%] px-5 py-3">Price Bought At</TableHead>
                  <TableHead className="w-[20%] px-5 py-3 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {sortedInventory.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan="4" className="px-5 py-10 text-center text-sm text-slate-500">No items in this category yet.</TableCell>
                  </TableRow>
                ) : (
                  sortedInventory.map((item) => (
                    <TableRow key={item.id} className="transition hover:bg-slate-50/80">
                      <TableCell className="whitespace-normal break-words px-5 py-4 font-medium text-slate-800">{item.name}</TableCell>
                      <TableCell className="px-5 py-4 text-slate-600">{item.qty}</TableCell>
                      <TableCell className="px-5 py-4 text-slate-600">${Number(item.price_bought_at || 0).toFixed(2)}</TableCell>
                      <TableCell className="px-5 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700" type="button" onClick={() => handleEdit(item)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-indigo-600">ANALYTICS</p><h3 className="mt-1 text-lg font-bold text-slate-900">Stock Overview</h3>
            <p className="mt-1 text-sm text-slate-500">Your inventory by category.</p>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} units`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600" aria-label="Inventory type legend">
            <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-indigo-600" />Cards</span>
            <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-emerald-500" />Sealed Product</span>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <div className="rounded-xl bg-muted p-3">
              <strong className="block text-lg font-semibold text-slate-900">{totalQuantity}</strong>
              <span className="mt-1 block text-xs text-slate-500">Total Quantity</span>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <strong className="block text-lg font-semibold text-slate-900">${totalInventoryValue.toFixed(2)}</strong>
              <span className="mt-1 block text-xs text-slate-500">Total Value</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
