// Calls the worker's /api/shipping-quote endpoint (see worker/index.js +
// worker/shipping.js + worker/tax.js) to get real-time shipping options and
// an estimated sales tax for a destination address. Unauthenticated - it
// only reads public product prices, so no access token is needed.
export async function fetchShippingQuote({ items, address }) {
  const res = await fetch('/api/shipping-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
      address,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Could not calculate shipping and tax')
  }
  return data
}
