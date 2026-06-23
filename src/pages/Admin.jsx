import React, { useState, useEffect } from 'react'
import { productsService } from '../services/supabaseService'
import '../styles/Admin.css'

export default function Admin() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    set_name: '',
    price: 0,
    stock_quantity: 0,
    image_url: '',
    description: '',
    condition: '',
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const data = await productsService.getAll()
      setProducts(data)
    } catch (err) {
      console.error('Error fetching products:', err)
      alert('Error loading products')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async (e) => {
    e.preventDefault()

    try {
      setLoading(true)

      if (editingId) {
        await productsService.update(editingId, formData)
        alert('Product updated successfully!')
      } else {
        await productsService.create(formData)
        alert('Product added successfully!')
      }

      resetForm()
      fetchProducts()
    } catch (err) {
      console.error('Error saving product:', err)
      alert('Error saving product')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product) => {
    setFormData(product)
    setEditingId(product.id)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        setLoading(true)
        await productsService.delete(id)
        alert('Product deleted successfully!')
        fetchProducts()
      } catch (err) {
        console.error('Error deleting product:', err)
        alert('Error deleting product')
      } finally {
        setLoading(false)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      set_name: '',
      price: 0,
      stock_quantity: 0,
      image_url: '',
      description: '',
      condition: '',
    })
    setEditingId(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'price' || name === 'stock_quantity' ? parseFloat(value) || 0 : value,
    }))
  }

  return (
    <div className="admin-container">
      <h1>Admin Panel - Product Management</h1>

      {/* Add/Edit Product Form */}
      <section className="admin-form-section">
        <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
        <form onSubmit={handleAddProduct} className="product-form">
          <div className="form-group">
            <label>Product Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Set Name</label>
            <input
              type="text"
              name="set_name"
              value={formData.set_name}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price ($) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>Stock Quantity *</label>
              <input
                type="number"
                name="stock_quantity"
                value={formData.stock_quantity}
                onChange={handleInputChange}
                min="0"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Image URL</label>
            <input
              type="url"
              name="image_url"
              value={formData.image_url}
              onChange={handleInputChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Condition</label>
            <select name="condition" value={formData.condition} onChange={handleInputChange}>
              <option value="">Select condition...</option>
              <option value="Sealed">Sealed</option>
              <option value="Near Mint">Near Mint</option>
              <option value="Mint">Mint</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={loading}>
              {editingId ? 'Update Product' : 'Add Product'}
            </button>
            {editingId && (
              <button type="button" className="btn-cancel" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Products List */}
      <section className="admin-products-section">
        <h2>Products ({products.length})</h2>

        {loading && <div className="loading">Loading...</div>}

        {products.length === 0 ? (
          <p>No products yet</p>
        ) : (
          <div className="products-table-wrapper">
            <table className="admin-products-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Set</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Condition</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.set_name}</td>
                    <td>${product.price.toFixed(2)}</td>
                    <td className={product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}>
                      {product.stock_quantity}
                    </td>
                    <td>{product.condition || '-'}</td>
                    <td className="actions">
                      <button className="btn-edit" onClick={() => handleEdit(product)}>
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(product.id)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
