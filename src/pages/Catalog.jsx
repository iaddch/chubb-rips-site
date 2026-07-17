import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon, SlidersHorizontalIcon } from 'lucide-react'
import { productsService } from '../services/supabaseService'
import { useProductStore, useCartStore } from '../store/index'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Slider } from '@/components/ui/slider'
import { NumberField, NumberFieldInput } from '@/components/ui/number-field'
import { toastManager } from '@/components/ui/toast'
import PageHeader, { PageHeaderStats } from '@/components/PageHeader'
import ProductImage from '@/components/ProductImage'

const PRICE_MIN = 0
const PRICE_MAX = 1000
const PRICE_BUCKET_COUNT = 24

const SORT_OPTIONS = [
  { label: 'Featured', value: 'featured' },
  { label: 'Price: low first', value: 'price-low' },
  { label: 'Price: high first', value: 'price-high' },
  { label: 'Name: A–Z', value: 'name' },
]

export default function Catalog() {
  const navigate = useNavigate()
  const { products, loading, filters, setProducts, setLoading, setFilters } = useProductStore()
  const addItem = useCartStore((state) => state.addItem)
  const cartItems = useCartStore((state) => state.items)
  const cartQuantityById = useMemo(
    () => Object.fromEntries(cartItems.map((item) => [item.product_id, item.quantity])),
    [cartItems]
  )
  const [filteredProducts, setFilteredProducts] = useState([])
  const [sort, setSort] = useState('featured')
  const [error, setError] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [addedId, setAddedId] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef(null)

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
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
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

  const inStockCount = useMemo(() => products.filter((product) => product.stock_quantity > 0).length, [products])

  const priceBuckets = useMemo(() => {
    const bucketSize = (PRICE_MAX - PRICE_MIN) / PRICE_BUCKET_COUNT
    const counts = Array.from({ length: PRICE_BUCKET_COUNT }, () => 0)
    products.forEach((product) => {
      const price = Number(product.price ?? 0)
      const index = Math.min(PRICE_BUCKET_COUNT - 1, Math.max(0, Math.floor((price - PRICE_MIN) / bucketSize)))
      counts[index] += 1
    })
    return counts
  }, [products])
  const maxBucketCount = Math.max(1, ...priceBuckets)

  const handleSearchChange = (e) => {
    const value = e.target.value
    setFilters({ search: value })
    setIsSearching(true)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => setIsSearching(false), 350)
  }

  const handleAddToCart = (product) => {
    addItem(product, 1)
    setAddedId(product.id)
    setAnnouncement(`Added ${product.name} to cart.`)
    setTimeout(() => setAddedId((current) => (current === product.id ? null : current)), 2000)
    toastManager.add({
      title: 'Added to cart',
      description: `${product.name} was added to your cart.`,
      type: 'success',
    })
  }

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
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
      <PageHeader
        title="Sealed Pokémon, kept simple."
        subtitle="Find the boxes, bundles, and collections worth adding to your shelf."
        actions={
          <PageHeaderStats
            stats={[
              { label: 'products', value: products.length },
              { label: 'in stock', value: inStockCount },
            ]}
          />
        }
      />

      <div className="grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-24">
          <button
            type="button"
            className="flex w-full items-center justify-between p-5 text-left lg:cursor-default lg:pb-0"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="catalog-filters"
          >
            <span className="flex items-center gap-1.5">
              <SlidersHorizontalIcon className="size-4 text-slate-500 lg:hidden" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-900">Browse filters</h2>
            </span>
            <svg className={`size-4 text-slate-500 transition-transform lg:hidden ${filtersOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </button>

          <div id="catalog-filters" className={`${filtersOpen ? 'block' : 'hidden'} px-5 pb-5 lg:block lg:pt-5`}>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="product-search">Search</Label>
                <InputGroup>
                  <InputGroupAddon>
                    {isSearching ? <Spinner /> : <SearchIcon aria-hidden="true" />}
                  </InputGroupAddon>
                  <InputGroupInput
                    id="product-search"
                    type="search"
                    placeholder="Search products"
                    value={filters.search}
                    onChange={handleSearchChange}
                  />
                </InputGroup>
              </div>
              <div className="space-y-3">
                <Label>Price range</Label>
                <div aria-hidden="true" className="flex h-10 w-full items-end px-1">
                  {priceBuckets.map((count, i) => {
                    const bucketSize = (PRICE_MAX - PRICE_MIN) / PRICE_BUCKET_COUNT
                    const rangeMin = PRICE_MIN + i * bucketSize
                    const rangeMax = PRICE_MIN + (i + 1) * bucketSize
                    const inRange = rangeMax >= filters.minPrice && rangeMin <= filters.maxPrice
                    return (
                      <div key={i} className="flex flex-1 justify-center" style={{ height: `${(count / maxBucketCount) * 100}%` }}>
                        <span className={`mx-px size-full ${inRange ? 'bg-primary/50' : 'bg-primary/20'}`} />
                      </div>
                    )
                  })}
                </div>
                <Slider
                  aria-label="Price range"
                  className="*:min-w-0!"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  value={[filters.minPrice, filters.maxPrice]}
                  onValueChange={(value) => {
                    const [next0, next1] = Array.isArray(value) ? value : [value, value]
                    setFilters({ minPrice: Math.min(next0, next1), maxPrice: Math.max(next0, next1) })
                  }}
                />
                <div className="flex items-center gap-2">
                  <InputGroup>
                    <NumberField
                      aria-label="Minimum price"
                      min={PRICE_MIN}
                      max={filters.maxPrice}
                      value={filters.minPrice}
                      onValueChange={(value) => setFilters({ minPrice: value ?? PRICE_MIN })}
                    >
                      <NumberFieldInput className="text-left" />
                    </NumberField>
                    <InputGroupAddon align="inline-end"><InputGroupText>$</InputGroupText></InputGroupAddon>
                  </InputGroup>
                  <span className="text-xs text-slate-400">to</span>
                  <InputGroup>
                    <NumberField
                      aria-label="Maximum price"
                      min={filters.minPrice}
                      max={PRICE_MAX}
                      value={filters.maxPrice}
                      onValueChange={(value) => setFilters({ maxPrice: value ?? PRICE_MAX })}
                    >
                      <NumberFieldInput className="text-left" />
                    </NumberField>
                    <InputGroupAddon align="inline-end"><InputGroupText>$</InputGroupText></InputGroupAddon>
                  </InputGroup>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <Label htmlFor="in-stock" className="cursor-pointer">In stock only</Label>
                <Switch id="in-stock" checked={filters.inStockOnly} onCheckedChange={(checked) => setFilters({ inStockOnly: checked })} />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mx-auto mt-5 block text-center text-xs text-muted-foreground"
              onClick={() => setFilters({ search: '', minPrice: PRICE_MIN, maxPrice: PRICE_MAX, inStockOnly: false })}
            >
              Reset
            </Button>
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
              <Select value={sort} onValueChange={setSort} items={SORT_OPTIONS}>
                <SelectTrigger id="sort-products">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {SORT_OPTIONS.map(({ label, value }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          </div>

          {displayedProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <h3 className="text-lg font-semibold text-slate-900">Nothing matches those filters</h3>
              <p className="mt-2 text-sm text-muted-foreground">Try clearing a filter or broadening your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {displayedProducts.map((product) => {
                const inCartQty = cartQuantityById[product.id] || 0
                const soldOut = product.stock_quantity <= 0
                const atMax = !soldOut && inCartQty >= product.stock_quantity
                return (
                <article key={product.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transition-none sm:rounded-2xl">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 p-3 sm:p-6">
                    <ProductImage
                      src={product.image_url}
                      alt={product.name}
                      className="size-full"
                      imgClassName="size-full object-contain transition duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                    <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:left-4 sm:top-4 sm:px-2.5 sm:py-1 sm:text-xs ${product.stock_quantity > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{product.stock_quantity > 0 ? 'In stock' : 'Sold out'}</span>
                  </div>
                  <div className="p-3 sm:p-5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">{product.set_name || 'Pokémon TCG'}</p>
                    <h3 className="mt-1.5 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-900 sm:mt-2 sm:min-h-12 sm:text-base sm:leading-6">{product.name}</h3>
                    <div className="mt-3 flex items-center justify-between gap-2 sm:mt-5 sm:gap-3">
                      <span className="text-sm font-semibold text-slate-900 sm:text-lg">${Number(product.price ?? 0).toFixed(2)}</span>
                      <Button variant="ghost" size="sm" className="px-2 text-xs text-slate-500 sm:px-3 sm:text-sm" onClick={() => navigate(`/product/${product.id}`)}>View item</Button>
                    </div>
                    <Button
                      className="mt-2 w-full sm:mt-3"
                      size="sm"
                      disabled={soldOut || atMax}
                      onClick={() => handleAddToCart(product)}
                    >
                      {soldOut ? 'Sold out' : atMax ? 'All in cart' : addedId === product.id ? 'Added ✓' : 'Add to cart'}
                    </Button>
                  </div>
                </article>
                )
              })}
            </div>
          )}
        </main>
        <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      </div>
    </section>
  )
}
