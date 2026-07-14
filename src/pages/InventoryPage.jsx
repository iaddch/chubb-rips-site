import React, { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from '../config/supabase'
import '../styles/InventoryPage.css'
import '../styles/SalesPage.css'

const initialForm = () => ({
  name: '',
  type: 'Card',
  qty: '',
  price_bought_at: '',
})

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState([])
  const [activeTab, setActiveTab] = useState('Cards')
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
      { name: 'Cards', value: cardsQty, color: '#a82028' },
      { name: 'Sealed Product', value: sealedQty, color: '#c85048' },
    ].filter((entry) => entry.value > 0)
  }, [inventoryItems])

  const totalQuantity = useMemo(() => inventoryItems.reduce((sum, item) => sum + Number(item.qty || 0), 0), [inventoryItems])
  const totalInventoryValue = useMemo(() => inventoryItems.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price_bought_at || 0), 0), [inventoryItems])

  return (
    <section className="inventory-page">
      <div className="inventory-page__header">
        <div>
          <h2>Inventory</h2>
          <p>Track your current card and sealed product stock.</p>
        </div>
      </div>

      <div className="inventory-page__dashboard">
        <div className="inventory-page__panel">
          <div className="inventory-page__section-title">
            <h3>{editingItemId ? 'Edit Inventory Item' : 'Add Inventory Item'}</h3>
          </div>
          <form className="inventory-form" onSubmit={handleSubmit}>
            <div className="inventory-form__row">
              <div className="field-group">
                <label htmlFor="inventory-name">Product Name</label>
                <input
                  id="inventory-name"
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  placeholder="e.g. Charizard ex Obsidian Flames"
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="inventory-type">Type</label>
                <select
                  id="inventory-type"
                  className="inventory-select"
                  style={{ fontStyle: 'normal', paddingLeft: '0.75rem' }}
                  value={form.type}
                  onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}
                >
                  <option value="Card">Card</option>
                  <option value="Sealed Product">Sealed Product</option>
                </select>
              </div>
            </div>
            <div className="inventory-form__row">
              <div className="field-group">
                <label htmlFor="inventory-qty">Current Qty</label>
                <input
                  id="inventory-qty"
                  type="number"
                  min="0"
                  value={form.qty}
                  onChange={(e) => setForm((current) => ({ ...current, qty: e.target.value }))}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="inventory-price">Price Bought At</label>
                <input
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
            <div className="sales-page__actions">
              <button className="button button--primary" type="submit" disabled={loading}>
                {loading ? (editingItemId ? 'Updating...' : 'Adding...') : (editingItemId ? 'Update Item' : 'Add Item')}
              </button>
              {editingItemId ? (
                <button className="inventory-edit-cancel" type="button" onClick={cancelEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
          {error ? <div className="message message--error">{error}</div> : null}
          {success ? <div className="message message--success">{success}</div> : null}
        </div>

        <div className="inventory-page__panel">
          <div className="inventory-page__tabs" role="tablist" aria-label="Inventory categories">
            <button
              type="button"
              className={`inventory-page__tab ${activeTab === 'Cards' ? 'inventory-page__tab--active' : ''}`}
              onClick={() => setActiveTab('Cards')}
            >
              Cards
            </button>
            <button
              type="button"
              className={`inventory-page__tab ${activeTab === 'Sealed Product' ? 'inventory-page__tab--active' : ''}`}
              onClick={() => setActiveTab('Sealed Product')}
            >
              Sealed Product
            </button>
          </div>

          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Current Qty</th>
                  <th>Price Bought At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="inventory-table__empty">No items in this category yet.</td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.qty}</td>
                      <td>${Number(item.price_bought_at || 0).toFixed(2)}</td>
                      <td>
                        <button className="inventory-edit-button" type="button" onClick={() => handleEdit(item)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="inventory-page__panel inventory-page__panel--analytics">
          <div className="inventory-page__section-title">
            <h3>Stock Overview</h3>
          </div>
          <div className="inventory-chart-wrap">
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
          <div className="inventory-chart-legend" aria-label="Inventory type legend">
            <span><i className="inventory-chart-legend__marker inventory-chart-legend__marker--cards" />Cards</span>
            <span><i className="inventory-chart-legend__marker inventory-chart-legend__marker--sealed" />Sealed Product</span>
          </div>
          <div className="inventory-summary">
            <div>
              <strong>{totalQuantity}</strong>
              <span>Total Quantity</span>
            </div>
            <div>
              <strong>${totalInventoryValue.toFixed(2)}</strong>
              <span>Total Inventory Value</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
