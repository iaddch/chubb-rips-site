import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { productsService } from '../services/supabaseService'
import { useProductStore } from '../store/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectNative } from '@/components/ui/select-native'
import { Switch } from '@/components/ui/switch'
import ProductImage from '@/components/ProductImage'

export default function Catalog() {
  const navigate = useNavigate()
  const { products, loading, filters, setProducts, setLoading, setFilters } = useProductStore()
  const [filteredProducts, setFilteredProducts] = useState([])
  const [sort, setSort] = useState('featured')
  const [error, setError] = useState(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      setProducts(await productsService.getAll())
    } catch (err) {
      console.error('Error fetching products:', err)
      setError('We couldn’t load the catalog. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let filtered = [...products]
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter((product) => product.name.toLowerCase().includes(search) || product.description?.toLowerCase().includes(search))
    }
    filtered = filtered.filter((product) => product.price >= filters.minPrice && product.price <= filters.maxPrice)
    if (filters.inStockOnly) filtered = filtered.filter((product) => product.stock_quantity > 0)
    setFilteredProducts(filtered)
  }, [products, filters])

  const displayedProducts = useMemo(() => [...filteredProducts].sort((a, b) => {
    if (sort === 'price-low') return a.price - b.price
    if (sort === 'price-high') return b.price - a.price
    if (sort === 'name') return a.name.localeCompare(b.name)
    return 0
  }), [filteredProducts, sort])

  if (loading) return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Loading the vault…</div>

  if (error) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-4 text-center">
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <Button className="mt-5" onClick={fetchProducts}>Try again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50">
      <section className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.22em] text-emerald-400">CHUBB&apos;S VAULT</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">Sealed Pokémon, kept simple.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">Find the boxes, bundles, and collections worth adding to your shelf.</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Browse filters</h2>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setFilters({ search: '', minPrice: 0, maxPrice: 1000, inStockOnly: false })}>Reset</Button>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="product-search">Search</Label>
              <Input id="product-search" type="search" placeholder="Search products" value={filters.search} onChange={(e) => setFilters({ search: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Price range</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input aria-label="Minimum price" type="number" min="0" placeholder="Min" value={filters.minPrice} onChange={(e) => setFilters({ minPrice: parseFloat(e.target.value) || 0 })} />
                <Input aria-label="Maximum price" type="number" min="0" placeholder="Max" value={filters.maxPrice} onChange={(e) => setFilters({ maxPrice: parseFloat(e.target.value) || 1000 })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <Label htmlFor="in-stock" className="cursor-pointer">In stock only</Label>
              <Switch id="in-stock" checked={filters.inStockOnly} onCheckedChange={(checked) => setFilters({ inStockOnly: checked })} />
            </div>
          </div>
        </aside>

        <main>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Showing {displayedProducts.length} product{displayedProducts.length === 1 ? '' : 's'}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Available now</h2>
            </div>
            <div className="w-full sm:w-44">
              <Label htmlFor="sort-products" className="mb-1.5 block text-xs">Sort by</Label>
              <SelectNative id="sort-products" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: low first</option>
                <option value="price-high">Price: high first</option>
                <option value="name">Name: A–Z</option>
              </SelectNative>
            </div>
          </div>

          {displayedProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <h3 className="text-lg font-semibold text-slate-900">Nothing matches those filters</h3>
              <p className="mt-2 text-sm text-muted-foreground">Try clearing a filter or broadening your search.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {displayedProducts.map((product) => (
                <article key={product.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 p-6">
                    <ProductImage
                      src={product.image_url}
                      alt={product.name}
                      className="size-full"
                      imgClassName="size-full object-contain transition duration-300 group-hover:scale-105"
                    />
                    <span className={`absolute left-4 top-4 rounded-full px-2.5 py-1 text-xs font-semibold ${product.stock_quantity > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{product.stock_quantity > 0 ? 'In stock' : 'Sold out'}</span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{product.set_name || 'Pokémon TCG'}</p>
                    <h3 className="mt-2 line-clamp-2 min-h-12 text-base font-semibold leading-6 text-slate-900">{product.name}</h3>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="text-lg font-semibold text-slate-900">${Number(product.price ?? 0).toFixed(2)}</span>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/product/${product.id}`)}>View item</Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
