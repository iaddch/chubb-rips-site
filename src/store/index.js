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

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null }),
}))

export const useCartStore = create((set, get) => ({
  items: typeof window !== 'undefined' ? loadCart() : [],
  loading: false,

  setItems: (items) => {
    set({ items })
    persistCart(items)
  },
  setLoading: (loading) => set({ loading }),

  addItem: (product, quantity) => {
    const items = get().items
    const existing = items.find((item) => item.product_id === product.id)

    if (existing) {
      set({
        items: items.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      })
      persistCart(get().items)
    } else {
      set({
        items: [
          ...items,
          { product_id: product.id, quantity, product },
        ],
      })
      persistCart(get().items)
    }
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
