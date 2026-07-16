import { supabase } from '../config/supabase'

// ============ PRODUCTS ============
export const productsService = {
  // Get all products with inventory
  getAll: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // Get single product
  getById: async (id) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // Create product
  create: async (productData) => {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
    if (error) throw error
    return data[0]
  },

  // Update product
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
    if (error) throw error
    return data[0]
  },

  // Delete product
  delete: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
  },

  // Update inventory
  updateInventory: async (productId, quantity) => {
    const { data, error } = await supabase
      .from('products')
      .update({ stock_quantity: quantity })
      .eq('id', productId)
      .select()
    if (error) throw error
    return data[0]
  },

  // Search products
  search: async (query) => {
    // Escape PostgREST filter syntax characters so user input can't inject
    // additional filter clauses (commas, parens) or break the ilike pattern.
    const escaped = String(query).replace(/[%,()]/g, '\\$&')
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%`)
    if (error) throw error
    return data
  },

  // Filter products
  filter: async (filters) => {
    let query = supabase.from('products').select('*')

    if (filters.setId) {
      query = query.eq('set_id', filters.setId)
    }
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      query = query.gte('price', filters.minPrice).lte('price', filters.maxPrice)
    }
    if (filters.inStockOnly) {
      query = query.gt('stock_quantity', 0)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },
}

// ============ REVIEWS ============
export const reviewsService = {
  // Get reviews for product
  getByProductId: async (productId) => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // Create review
  create: async (reviewData) => {
    const { data, error } = await supabase
      .from('reviews')
      .insert([reviewData])
      .select()
    if (error) throw error
    return data[0]
  },

  // Get average rating for product
  getAverageRating: async (productId) => {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId)
    if (error) throw error

    if (data.length === 0) return 0
    const average = data.reduce((sum, review) => sum + review.rating, 0) / data.length
    return Math.round(average * 10) / 10
  },
}

// ============ CART ============
// user_id is never accepted from the caller here - it's read from the
// current Supabase session so a caller can't pass someone else's user id.
// RLS on cart_items enforces the same thing server-side (auth.uid() =
// user_id), but deriving it here means there's no forgeable field at all.
const requireUserId = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('Not authenticated')
  return data.user.id
}

export const cartService = {
  // Get current user's cart
  getCart: async () => {
    const userId = await requireUserId()
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_id', userId)
    if (error) throw error
    return data
  },

  // Add item to current user's cart
  addItem: async (productId, quantity) => {
    const userId = await requireUserId()

    // Check if item already in cart
    const { data: existing } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single()

    if (existing) {
      return cartService.updateItem(existing.id, existing.quantity + quantity)
    }

    const { data, error } = await supabase
      .from('cart_items')
      .insert([{ user_id: userId, product_id: productId, quantity }])
      .select()
    if (error) throw error
    return data[0]
  },

  // Update cart item quantity
  updateItem: async (cartItemId, quantity) => {
    if (quantity <= 0) {
      return cartService.removeItem(cartItemId)
    }

    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', cartItemId)
      .select()
    if (error) throw error
    return data[0]
  },

  // Remove item from cart
  removeItem: async (cartItemId) => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)
    if (error) throw error
  },

  // Clear current user's entire cart
  clearCart: async () => {
    const userId = await requireUserId()
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
    if (error) throw error
  },
}

// ============ ORDERS ============
export const ordersService = {
  // Create new order
  create: async (orderData) => {
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
    if (error) throw error
    return data[0]
  },

  // Get user's orders
  getUserOrders: async (userId) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // Get single order
  getById: async (orderId) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        )
      `)
      .eq('id', orderId)
      .single()
    if (error) throw error
    return data
  },

  // Update order status
  updateStatus: async (orderId, status, paymentIntentId = null) => {
    const updates = { status }
    if (paymentIntentId) {
      updates.stripe_payment_intent_id = paymentIntentId
    }
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
    if (error) throw error
    return data[0]
  },
}

// ============ ORDER ITEMS ============
export const orderItemsService = {
  // Create order items (bulk insert)
  createBulk: async (orderItems) => {
    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select()
    if (error) throw error
    return data
  },
}
