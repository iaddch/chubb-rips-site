import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { productsService } from '../services/supabaseService'
import { useProductStore } from '../store/index'
import '../styles/Catalog.css'

export default function Catalog() {
  const navigate = useNavigate()
  const { products, loading, filters, setProducts, setLoading, setFilters } =
    useProductStore()
  const [filteredProducts, setFilteredProducts] = useState([])

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
    } finally {
      setLoading(false)
    }
  }

  // Filter products based on current filters
  useEffect(() => {
    let filtered = [...products]

    if (filters.search) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          (p.description?.toLowerCase().includes(filters.search.toLowerCase()) || false)
      )
    }

    if (filters.setId) {
      filtered = filtered.filter((p) => p.set_id === filters.setId)
    }

    filtered = filtered.filter((p) => p.price >= filters.minPrice && p.price <= filters.maxPrice)

    if (filters.inStockOnly) {
      filtered = filtered.filter((p) => p.stock_quantity > 0)
    }

    setFilteredProducts(filtered)
  }, [products, filters])

  if (loading) return <div className="loading">Loading products...</div>

  return (
    <div className="catalog-container">
      <h1>Pokemon TCG Sealed Products</h1>

      <div className="catalog-layout">
        {/* Filters Sidebar */}
        <aside className="filters-sidebar">
          <h3>Filters</h3>

          {/* Search */}
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search products..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="filter-input"
            />
          </div>

          {/* Price Range */}
          <div className="filter-group">
            <label>Price Range</label>
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => setFilters({ minPrice: parseFloat(e.target.value) || 0 })}
              className="filter-input"
              min="0"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ maxPrice: parseFloat(e.target.value) || 1000 })}
              className="filter-input"
              min="0"
            />
          </div>

          {/* Stock Filter */}
          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={filters.inStockOnly}
                onChange={(e) => setFilters({ inStockOnly: e.target.checked })}
              />
              In Stock Only
            </label>
          </div>

          <button onClick={() => setFilters({ search: '', minPrice: 0, maxPrice: 1000, inStockOnly: false })}
            className="btn-reset-filters"
          >
            Reset Filters
          </button>
        </aside>

        {/* Products Grid */}
        <main className="products-grid-container">
          {filteredProducts.length === 0 ? (
            <div className="no-products">No products found matching your filters.</div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((product) => (
                <div key={product.id} className="product-card">
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="product-image" />
                  )}
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-set">{product.set_name}</p>
                    <p className="product-price">${product.price.toFixed(2)}</p>
                    <p
                      className={`product-stock ${
                        product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'
                      }`}
                    >
                      {product.stock_quantity > 0 ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
                    </p>

                    <div className="product-actions">
                      <button
                        className="btn-details"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
