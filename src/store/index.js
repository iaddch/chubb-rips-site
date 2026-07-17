import { create } from 'zustand'
import { cartService } from '../services/supabaseService'

const loadCart = () => {
  try {
    const raw = localStorage.getItem('cart')
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

const persistCart = (items) => {
  try {
    localStorage.setItem('cart', JSON.stringify(items))
  } catch (e) {
    // ignore
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  isAdmin: false,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  logout: () => set({ user: null, isAdmin: false }),
}))

export const useCartStore = create((set, get) => ({
  items: typeof window !== 'undefined' ? loadCart() : [],
  loading: false,

  setItems: (items) => {
    set({ items })
    persistCart(items)
  },
  setLoading: (loading) => set({ loading }),

  // Clamps to the product's current stock so repeated adds (quick-add
  // spam-clicks, or adding the same item from both the catalog and the
  // product page) can never push the cart past what's actually available.
  // Returns the quantity that actually landed in the cart, so callers can
  // tell the user when their request got capped.
  addItem: (product, quantity) => {
    const items = get().items
    const existing = items.find((item) => item.product_id === product.id)
    const stock = Number.isFinite(product.stock_quantity) ? product.stock_quantity : Infinity

    if (existing) {
      const nextQuantity = Math.min(stock, existing.quantity + quantity)
      set({
        items: items.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: nextQuantity, product }
            : item
        ),
      })
      persistCart(get().items)
      return nextQuantity
    }

    const nextQuantity = Math.min(stock, quantity)
    set({
      items: [
        ...items,
        { product_id: product.id, quantity: nextQuantity, product },
      ],
    })
    persistCart(get().items)
    return nextQuantity
  },

  updateItemQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }

    set({
      items: get().items.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      ),
    })
    persistCart(get().items)
  },

  removeItem: (productId) => {
    set({
      items: get().items.filter((item) => item.product_id !== productId),
    })
    persistCart(get().items)
  },

  clearCart: () => {
    set({ items: [] })
    persistCart([])
  },

  getTotal: () => {
    return get().items.reduce(
      (total, item) => total + (item.product?.price || 0) * item.quantity,
      0
    )
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0)
  },
}))

export const useSiteSettingsStore = create((set) => ({
  checkoutsEnabled: true,
  settingsLoaded: false,

  setCheckoutsEnabled: (checkoutsEnabled) => set({ checkoutsEnabled, settingsLoaded: true }),
}))

export const useProductStore = create((set) => ({
  products: [],
  loading: false,
  error: null,
  filters: {
    search: '',
    setId: null,
    minPrice: 0,
    maxPrice: 1000,
    inStockOnly: false,
  },

  setProducts: (products) => set({ products }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
}))
