import React, { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../config/supabase'
import '../styles/SalesPage.css'

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

  const fetchEvents = async () => {
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true })

    if (!error) {
      setEvents(data || [])
    }
  }

  const fetchSalesForEvent = async (eventId) => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (!error) {
      setSales(data || [])
    }
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
      <section className="sales-page">
        <div className="sales-page__header">
          <div>
            <h2>Event & Sales Dashboard</h2>
            <p>Manage events and log sales for each pop-up or market day.</p>
          </div>
        </div>

        <div className="sales-page__panel">
          <div className="sales-page__header sales-page__header--events">
            <h3>Events</h3>
            <span>{events.length} total</span>
          </div>
          <div className="sales-page__grid sales-page__grid--events">
            {eventAnalytics.map((event) => (
              <button key={event.id} className="event-card" type="button" onClick={() => setSelectedEvent(event)}>
                <div className="event-card__content-block">
                  <div className="event-card__top">
                    <strong>{event.name}</strong>
                    <span>{event.date}</span>
                  </div>
                  <div className="event-card__meta">
                    <span>{event.address}</span>
                  </div>
                </div>

                <div className="event-card__chart-block">
                  <div className="event-card__chart-wrap">
                    <div className="event-card__chart" aria-hidden="true">
                      <div className="event-card__chart-bar revenue" style={{ height: `${Math.max(18, Math.min(100, event.revenue ? event.revenue / 4 : 0))}%` }} />
                      <div className="event-card__chart-bar profit" style={{ height: `${Math.max(18, Math.min(100, event.profit ? event.profit / 4 : 0))}%` }} />
                    </div>
                  </div>
                  <div className="event-card__metrics">
                    <span>Rev ${event.revenue.toFixed(2)}</span>
                    <span>Prof ${event.profit.toFixed(2)}</span>
                  </div>
                </div>
              </button>
            ))}
            <button type="button" className="event-card event-card--add" onClick={() => setShowCreateEvent((current) => !current)}>
              <span className="event-card__plus">+</span>
              <span className="event-card__label">New Event</span>
            </button>
          </div>

          {showCreateEvent ? (
            <div className="event-create-panel">
              <form className="event-form" onSubmit={handleCreateEvent}>
                <div className="event-form__row">
                  <div className="field-group">
                    <label htmlFor="event-name">Event Name</label>
                    <input
                      id="event-name"
                      value={eventForm.name}
                      onChange={(e) => setEventForm((current) => ({ ...current, name: e.target.value }))}
                      placeholder="e.g. Downtown Market"
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="event-date">Date</label>
                    <input
                      id="event-date"
                      type="date"
                      value={eventForm.date}
                      onChange={(e) => setEventForm((current) => ({ ...current, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="field-group">
                  <label htmlFor="event-address">Address</label>
                  <input
                    id="event-address"
                    value={eventForm.address}
                    onChange={(e) => setEventForm((current) => ({ ...current, address: e.target.value }))}
                    placeholder="Venue address"
                    required
                  />
                </div>
                <div className="sales-page__actions">
                  <button className="button button--primary" type="submit" disabled={eventLoading}>
                    {eventLoading ? 'Creating...' : 'Create Event'}
                  </button>
                  <button className="button button--ghost" type="button" onClick={() => setShowCreateEvent(false)}>
                    Cancel
                  </button>
                </div>
              </form>
              {eventError ? <div className="message message--error">{eventError}</div> : null}
              {eventSuccess ? <div className="message message--success">{eventSuccess}</div> : null}
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <section className="sales-page">
      <div className="sales-page__header">
        <div>
          <h2>{selectedEvent.name}</h2>
          <p>{selectedEvent.address} • {selectedEvent.date}</p>
        </div>
        <div className="sales-page__actions">
          <button className="button button--secondary" type="button" onClick={() => setSelectedEvent(null)}>
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="sales-page__detail-grid sales-page__detail-grid--three">
        <div className="sales-page__detail-column">
          <div className="sales-page__panel">
            <div className="sales-page__section-title">
              <h3>Log a Sale</h3>
            </div>
            <form className="sales-form" onSubmit={handleSubmitSale}>
              {saleItems.map((item, index) => (
                <div key={index} className="sale-item-row">
                  <div className="sale-item-row__header">
                    <strong>Item {index + 1}</strong>
                    {saleItems.length > 1 ? (
                      <button className="button button--ghost" type="button" onClick={() => removeItemRow(index)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="sales-form__row">
                    <div className="field-group">
                      <label>Product Name</label>
                      <input
                        value={item.product_name}
                        onChange={(e) => {
                          handleItemChange(index, 'product_name', e.target.value)
                          setInventoryQuery(e.target.value)
                        }}
                        placeholder="Search inventory"
                        required
                      />
                      {inventoryQuery || item.product_name ? (
                        <div className="inventory-suggestions">
                          {inventoryItems
                            .filter((inventoryItem) => inventoryItem.name.toLowerCase().includes((item.product_name || inventoryQuery).toLowerCase()))
                            .slice(0, 5)
                            .map((inventoryItem) => (
                              <button
                                key={inventoryItem.id}
                                type="button"
                                className="inventory-suggestion"
                                onClick={() => handleInventorySelect(index, inventoryItem)}
                              >
                                {inventoryItem.name} • Qty {inventoryItem.qty}
                              </button>
                            ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="field-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="sales-form__row">
                    <div className="field-group">
                      <label>Bought For</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.bought_price}
                        onChange={(e) => handleItemChange(index, 'bought_price', e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label>Sold For</label>
                      <input
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

              <div className="sales-page__actions">
                <button className="button button--secondary" type="button" onClick={addItemRow}>
                  Add Product Line
                </button>
                {editingSaleId ? (
                  <button className="button button--ghost" type="button" onClick={handleCancelEdit}>
                    Cancel Edit
                  </button>
                ) : null}
                <button className="button button--primary" type="submit" disabled={saleLoading}>
                  {saleLoading ? 'Saving...' : editingSaleId ? 'Update Sale' : 'Save Sale'}
                </button>
              </div>
            </form>
            {saleError ? <div className="message message--error">{saleError}</div> : null}
            {saleSuccess ? <div className="message message--success">{saleSuccess}</div> : null}
          </div>
        </div>

        <div className="sales-page__detail-column">
          <div className="sales-page__panel sales-page__panel--history">
            <div className="sales-page__header">
              <h3>Recent Sales</h3>
              <span>Total revenue: ${totalRevenue.toFixed(2)}</span>
            </div>

            <div className="sales-list">
              {sales.length === 0 ? (
                <p>No sales logged for this event yet.</p>
              ) : (
                [...sales]
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map((sale) => (
                    <article key={sale.id} className="sale-card">
                      <div className="sale-card__header">
                        <strong>{new Date(sale.created_at).toLocaleString()}</strong>
                        <div className="sale-card__actions">
                          <button className="sale-card__edit" type="button" onClick={() => handleEditSale(sale)}>
                            Edit
                          </button>
                          <button className="sale-card__delete" type="button" onClick={() => handleDeleteSale(sale.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="sale-card__items">
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
        </div>

        <div className="sales-page__detail-column">
          <div className="sales-page__panel sales-page__panel--analytics">
            <div className="sales-page__header">
              <h3>Analytics</h3>
              <span>Event summary</span>
            </div>

            <div className="analytics-chart">
              <div className="analytics-chart__legend">
                <span><span className="analytics-chart__swatch analytics-chart__swatch--revenue" /> Revenue</span>
                <span><span className="analytics-chart__swatch analytics-chart__swatch--profit" /> Profit</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                  <XAxis dataKey="name" tick={{ fill: '#304160', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#304160', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => `$${Number(value).toFixed(2)}`}
                    contentStyle={{ borderRadius: '10px', borderColor: '#a8b8c8' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} fill="#ff6b57" />
                  <Bar dataKey="profit" name="Profit" radius={[6, 6, 0, 0]} fill="#a82028" />
                </BarChart>
              </ResponsiveContainer>
              <div className="analytics-chart__summary">
                <div>
                  <strong>${totalRevenue.toFixed(2)}</strong>
                  <span>Total Revenue</span>
                </div>
                <div>
                  <strong>${totalProfit.toFixed(2)}</strong>
                  <span>Total Profit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
