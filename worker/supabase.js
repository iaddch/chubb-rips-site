// Thin Supabase REST helpers for the worker. Two distinct credentials are
// used on purpose:
//  - the caller's own access token (RLS-scoped) to read data on their
//    behalf, so a user can never read/act on someone else's order
//  - the service role key (RLS-bypassing, server-only, never sent to the
//    browser) strictly to write the verified payment result back

export async function getOwnOrder(supabaseUrl, anonKey, accessToken, orderId) {
  const url = `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,status,shipping_address`
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!res.ok) throw new Error('Failed to load order')
  const rows = await res.json()
  return rows[0] || null
}

export async function getOwnOrderItems(supabaseUrl, anonKey, accessToken, orderId) {
  const url = `${supabaseUrl}/rest/v1/order_items?order_id=eq.${encodeURIComponent(orderId)}&select=product_id,quantity`
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!res.ok) throw new Error('Failed to load order items')
  return res.json()
}

// Prices are re-fetched from the live products table rather than trusted
// from order_items, so a tampered client-side price never reaches Stripe.
export async function getProductPrices(supabaseUrl, anonKey, productIds) {
  if (productIds.length === 0) return {}
  const idList = productIds.map((id) => `"${id}"`).join(',')
  const url = `${supabaseUrl}/rest/v1/products?id=in.(${idList})&select=id,price`
  const res = await fetch(url, { headers: { apikey: anonKey } })
  if (!res.ok) throw new Error('Failed to load product prices')
  const rows = await res.json()
  return Object.fromEntries(rows.map((row) => [row.id, Number(row.price)]))
}

// Public read (no auth needed) of the global checkout kill switch, so a
// determined caller can't take payment through this endpoint while an
// admin has paused checkouts, even though the button is only hidden
// client-side.
export async function getCheckoutsEnabled(supabaseUrl, anonKey) {
  const url = `${supabaseUrl}/rest/v1/site_settings?id=eq.1&select=checkouts_enabled`
  const res = await fetch(url, { headers: { apikey: anonKey } })
  if (!res.ok) throw new Error('Failed to load site settings')
  const rows = await res.json()
  return rows[0]?.checkouts_enabled ?? true
}

export async function markOrderPaid(supabaseUrl, serviceRoleKey, orderId, paymentIntentId) {
  const url = `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ status: 'paid', stripe_payment_intent_id: paymentIntentId }),
  })
  if (!res.ok) throw new Error('Failed to update order status')
}
