import React, { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../config/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialItem = () => ({
  product_name: '',
  quantity: 1,
  bought_price: '',
  sold_price: '',
  inventory_id: null,
})

const initialEventForm = () => ({
  name: '',
  address: '',
  date: '',
})

export default function SalesPage() {
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventForm, setEventForm] = useState(initialEventForm())
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [eventLoading, setEventLoading] = useState(false)
  const [eventError, setEventError] = useState('')
  const [eventSuccess, setEventSuccess] = useState('')
  const [saleItems, setSaleItems] = useState([initialItem()])
  const [saleLoading, setSaleLoading] = useState(false)
  const [saleError, setSaleError] = useState('')
  const [saleSuccess, setSaleSuccess] = useState('')
  const [sales, setSales] = useState([])
  const [editingSaleId, setEditingSaleId] = useState(null)
  const [inventoryItems, setInventoryItems] = useState([])
  const [inventoryQuery, setInventoryQuery] = useState('')
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsLoadError, setEventsLoadError] = useState('')
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesLoadError, setSalesLoadError] = useState('')

  const fetchEvents = async () => {
    setEventsLoading(true)
    setEventsLoadError('')
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true })

    if (error) {
      setEventsLoadError('Couldn’t load events. Check your connection and try again.')
    } else {
      setEvents(data || [])
    }
    setEventsLoading(false)
  }

  const fetchSalesForEvent = async (eventId) => {
    setSalesLoading(true)
    setSalesLoadError('')
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) {
      setSalesLoadError('Couldn’t load sales for this event.')
    } else {
      setSales(data || [])
    }
    setSalesLoading(false)
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEvent?.id) {
      fetchSalesForEvent(selectedEvent.id)
    }
  }, [selectedEvent])

  const fetchInventory = async () => {
    const { data, error: inventoryError } = await supabase.from('inventory').select('*').gt('qty', 0).order('name', { ascending: true })
    if (!inventoryError) {
      setInventoryItems(data || [])
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setEventLoading(true)
    setEventError('')
    setEventSuccess('')

    const { error } = await supabase.from('events').insert({
      name: eventForm.name,
      address: eventForm.address,
      date: eventForm.date,
    })

    setEventLoading(false)

    if (error) {
      setEventError(error.message)
      return
    }

    setEventSuccess('Event created successfully.')
    setEventForm(initialEventForm())
    setShowCreateEvent(false)
    fetchEvents()
  }

  const handleItemChange = (index, field, value) => {
    setSaleItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    )
  }

  const handleInventorySelect = (index, inventoryItem) => {
    setSaleItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item

        return {
          ...item,
          product_name: inventoryItem.name,
          bought_price: String(inventoryItem.price_bought_at ?? 0),
          inventory_id: inventoryItem.id,
        }
      })
    )
    setInventoryQuery('')
  }

  const addItemRow = () => {
    setSaleItems((current) => [...current, initialItem()])
  }

  const removeItemRow = (index) => {
    setSaleItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleSubmitSale = async (e) => {
    e.preventDefault()

    if (!selectedEvent?.id) {
      setSaleError('Select an event before logging a sale.')
      return
    }

    const hasEmptyFields = saleItems.some((item) => !item.product_name || !item.quantity || !item.bought_price || !item.sold_price)
    if (hasEmptyFields) {
      setSaleError('Please complete every product line before submitting.')
      return
    }

    setSaleLoading(true)
    setSaleError('')
    setSaleSuccess('')

    const payload = {
      event_id: selectedEvent.id,
      items: saleItems.map((item) => ({
        product_name: item.product_name,
        quantity: Number(item.quantity),
        bought_price: Number(item.bought_price),
        sold_price: Number(item.sold_price),
        inventory_id: item.inventory_id || null,
      })),
    }

    const { error } = editingSaleId
      ? await supabase.from('sales').update(payload).eq('id', editingSaleId)
      : await supabase.from('sales').insert(payload)

    setSaleLoading(false)

    if (error) {
      setSaleError(error.message)
      return
    }

    if (!error) {
      for (const item of saleItems) {
        if (item.inventory_id && Number(item.quantity) > 0) {
          const { data: currentInventory, error: lookupError } = await supabase
            .from('inventory')
            .select('qty')
            .eq('id', item.inventory_id)
            .single()

          if (!lookupError && currentInventory) {
            const nextQty = Math.max(0, Number(currentInventory.qty || 0) - Number(item.quantity))
            const { error: stockError } = await supabase
              .from('inventory')
              .update({ qty: nextQty })
              .eq('id', item.inventory_id)

            if (stockError) {
              console.error(stockError)
            }
          }
        }
      }

      fetchInventory()
    }

    setSaleSuccess(editingSaleId ? 'Sale updated successfully.' : 'Sale logged successfully.')
    setSaleItems([initialItem()])
    setEditingSaleId(null)
    fetchSalesForEvent(selectedEvent.id)
  }

  const handleEditSale = (sale) => {
    setEditingSaleId(sale.id)
    setSaleItems(
      (sale.items || []).map((item) => ({
        product_name: item.product_name,
        quantity: Number(item.quantity || 1),
        bought_price: Number(item.bought_price || 0),
        sold_price: Number(item.sold_price || 0),
        inventory_id: item.inventory_id || null,
      }))
    )
    setSaleError('')
    setSaleSuccess('')
  }

  const handleCancelEdit = () => {
    setEditingSaleId(null)
    setSaleItems([initialItem()])
    setSaleError('')
    setSaleSuccess('')
  }

  const handleDeleteSale = async (saleId) => {
    const { error } = await supabase.from('sales').delete().eq('id', saleId)

    if (error) {
      setSaleError(error.message)
      return
    }

    setSales((current) => current.filter((sale) => sale.id !== saleId))
    setSaleSuccess('Sale deleted successfully.')
  }

  const totalRevenue = useMemo(() => {
    return sales.reduce((sum, sale) => {
      const saleTotal = (sale.items || []).reduce((itemSum, item) => {
        return itemSum + Number(item.sold_price || 0) * Number(item.quantity || 0)
      }, 0)

      return sum + saleTotal
    }, 0)
  }, [sales])

  const totalProfit = useMemo(() => {
    return sales.reduce((sum, sale) => {
      const saleProfit = (sale.items || []).reduce((itemSum, item) => {
        const quantity = Number(item.quantity || 0)
        const bought = Number(item.bought_price || 0)
        const sold = Number(item.sold_price || 0)
        return itemSum + (sold - bought) * quantity
      }, 0)

      return sum + saleProfit
    }, 0)
  }, [sales])

  const chartData = useMemo(() => [
    { name: 'Totals', revenue: totalRevenue, profit: totalProfit },
  ], [totalProfit, totalRevenue])

  const eventAnalytics = useMemo(() => {
    return events.map((event) => {
      const eventSales = sales.filter((sale) => sale.event_id === event.id)
      const revenue = eventSales.reduce((sum, sale) => {
        return sum + (sale.items || []).reduce((itemSum, item) => {
          return itemSum + Number(item.sold_price || 0) * Number(item.quantity || 0)
        }, 0)
      }, 0)
      const profit = eventSales.reduce((sum, sale) => {
        return sum + (sale.items || []).reduce((itemSum, item) => {
          const quantity = Number(item.quantity || 0)
          const bought = Number(item.bought_price || 0)
          const sold = Number(item.sold_price || 0)
          return itemSum + (sold - bought) * quantity
        }, 0)
      }, 0)

      return { ...event, revenue, profit }
    })
  }, [events, sales])

  if (!selectedEvent) {
    return (
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-indigo-600">DASHBOARD</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Event &amp; Sales Dashboard</h2>
            <p className="mt-1 text-sm text-slate-500">Manage events and log sales for each pop-up or market day.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Events</h3>
            <span className="text-sm text-slate-500">{events.length} total</span>
          </div>
          {eventsLoadError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm">
              <p className="text-red-700">{eventsLoadError}</p>
              <Button variant="outline" size="sm" type="button" className="mt-3" onClick={fetchEvents}>Try again</Button>
            </div>
          ) : eventsLoading ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">Loading events…</div>
          ) : (
          <div className="flex flex-wrap items-stretch gap-4">
            {eventAnalytics.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEvent(event)}
                className="flex min-h-[220px] min-w-[220px] flex-1 flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-900 hover:shadow-md"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="font-extrabold text-slate-900">{event.name}</strong>
                    <span className="text-xs text-slate-500">{event.date}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <span>{event.address}</span>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-2">
                  <div className="flex h-16 items-end justify-center gap-2 pt-1">
                    <div
                      className="min-h-[18px] flex-1 rounded-t-full bg-gradient-to-t from-indigo-700 to-indigo-500"
                      style={{ height: `${Math.max(18, Math.min(100, event.revenue ? event.revenue / 4 : 0))}%` }}
                    />
                    <div
                      className="min-h-[18px] flex-1 rounded-t-full bg-gradient-to-t from-emerald-700 to-emerald-500"
                      style={{ height: `${Math.max(18, Math.min(100, event.profit ? event.profit / 4 : 0))}%` }}
                    />
                  </div>
                  <div className="flex justify-between gap-2 border-t border-slate-100 pt-2 text-xs font-medium">
                    <span className="text-indigo-600">Rev ${event.revenue.toFixed(2)}</span>
                    <span className="text-emerald-600">Prof ${event.profit.toFixed(2)}</span>
                  </div>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCreateEvent((current) => !current)}
              className="flex min-h-[168px] min-w-[220px] flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-all duration-200 hover:border-indigo-400 hover:text-indigo-600"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="font-bold">New Event</span>
            </button>
          </div>
          )}

          {showCreateEvent ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <form className="flex flex-col gap-3" onSubmit={handleCreateEvent}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="event-name">Event Name</Label>
                    <Input
                      id="event-name"
                      value={eventForm.name}
                      onChange={(e) => setEventForm((current) => ({ ...current, name: e.target.value }))}
                      placeholder="e.g. Downtown Market"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="event-date">Date</Label>
                    <Input
                      id="event-date"
                      type="date"
                      value={eventForm.date}
                      onChange={(e) => setEventForm((current) => ({ ...current, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event-address">Address</Label>
                  <Input
                    id="event-address"
                    value={eventForm.address}
                    onChange={(e) => setEventForm((current) => ({ ...current, address: e.target.value }))}
                    placeholder="Venue address"
                    required
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={eventLoading}>
                    {eventLoading ? 'Creating...' : 'Create Event'}
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setShowCreateEvent(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
              {eventError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{eventError}</div> : null}
              {eventSuccess ? <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{eventSuccess}</div> : null}
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-indigo-600">EVENT DETAIL</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{selectedEvent.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{selectedEvent.address} • {selectedEvent.date}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" type="button" onClick={() => setSelectedEvent(null)}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900">Log a Sale</h3>
          </div>
          <form className="flex flex-col gap-3" onSubmit={handleSubmitSale}>
            {saleItems.map((item, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <strong className="text-sm font-bold text-slate-900">Item {index + 1}</strong>
                  {saleItems.length > 1 ? (
                    <Button variant="outline" size="sm" type="button" onClick={() => removeItemRow(index)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative space-y-1.5">
                    <Label>Product Name</Label>
                    <Input
                      value={item.product_name}
                      onChange={(e) => {
                        handleItemChange(index, 'product_name', e.target.value)
                        setInventoryQuery(e.target.value)
                      }}
                      placeholder="Search inventory"
                      required
                    />
                    {inventoryQuery || item.product_name ? (
                      <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {inventoryItems
                          .filter((inventoryItem) => inventoryItem.name.toLowerCase().includes((item.product_name || inventoryQuery).toLowerCase()))
                          .slice(0, 5)
                          .map((inventoryItem) => (
                            <button
                              key={inventoryItem.id}
                              type="button"
                              className="rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                              onClick={() => handleInventorySelect(index, inventoryItem)}
                            >
                              {inventoryItem.name} • Qty {inventoryItem.qty}
                            </button>
                          ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Bought For</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.bought_price}
                      onChange={(e) => handleItemChange(index, 'bought_price', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sold For</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.sold_price}
                      onChange={(e) => handleItemChange(index, 'sold_price', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" type="button" onClick={addItemRow}>
                Add Product Line
              </Button>
              {editingSaleId ? (
                <Button variant="outline" type="button" onClick={handleCancelEdit}>
                  Cancel Edit
                </Button>
              ) : null}
              <Button type="submit" disabled={saleLoading}>
                {saleLoading ? 'Saving...' : editingSaleId ? 'Update Sale' : 'Save Sale'}
              </Button>
            </div>
          </form>
          {saleError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{saleError}</div> : null}
          {saleSuccess ? <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{saleSuccess}</div> : null}
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Recent Sales</h3>
            <span className="text-sm text-slate-500">Total revenue: ${totalRevenue.toFixed(2)}</span>
          </div>

          <div className="flex max-h-[400px] flex-col gap-3 overflow-y-auto pr-1">
            {salesLoadError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-center text-sm">
                <p className="text-red-700">{salesLoadError}</p>
                <Button variant="outline" size="sm" type="button" className="mt-2" onClick={() => fetchSalesForEvent(selectedEvent.id)}>Try again</Button>
              </div>
            ) : salesLoading ? (
              <p className="text-sm text-slate-500">Loading sales…</p>
            ) : sales.length === 0 ? (
              <p className="text-sm text-slate-500">No sales logged for this event yet.</p>
            ) : (
              [...sales]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((sale) => (
                  <article key={sale.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <strong className="text-sm font-semibold text-slate-900">{new Date(sale.created_at).toLocaleString()}</strong>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" type="button" onClick={() => handleEditSale(sale)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" type="button" onClick={() => handleDeleteSale(sale.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-slate-600">
                      {(sale.items || []).map((item, index) => (
                        <span key={`${sale.id}-${index}`}>
                          {item.product_name} • Qty {item.quantity} • Bought ${Number(item.bought_price || 0).toFixed(2)} • Sold ${Number(item.sold_price || 0).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </article>
                ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md md:sticky md:top-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Analytics</h3>
            <span className="text-sm text-slate-500">Event summary</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3">
            <div className="mb-2 flex gap-4 text-sm font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1.5"><span className="inline-block size-3 rounded-full bg-indigo-500" /> Revenue</span>
              <span className="inline-flex items-center gap-1.5"><span className="inline-block size-3 rounded-full bg-emerald-500" /> Profit</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => `$${Number(value).toFixed(2)}`}
                  contentStyle={{ borderRadius: '10px', borderColor: '#e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} fill="#4f46e5" />
                <Bar dataKey="profit" name="Profit" radius={[6, 6, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-between gap-4 border-t border-slate-200 pt-2">
              <div className="flex flex-col gap-0.5">
                <strong className="text-base text-slate-900">${totalRevenue.toFixed(2)}</strong>
                <span className="text-xs text-slate-500">Total Revenue</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <strong className="text-base text-slate-900">${totalProfit.toFixed(2)}</strong>
                <span className="text-xs text-slate-500">Total Profit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
