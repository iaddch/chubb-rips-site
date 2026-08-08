// Real-time shipping rates via Shippo (https://goshippo.com) - a
// multi-carrier aggregator (USPS/UPS/FedEx/DHL) that rates a shipment from
// a distance + weight + dimensions calculation, same as the carriers'
// own calculators.
//
// The store doesn't track a weight/dimensions per product yet, so package
// weight is a flat estimate based on total item count rather than exact
// product data - see AVERAGE_ITEM_WEIGHT_OZ below. Swap this for a real
// per-product weight lookup once that data exists.
const SHIPPO_API_URL = 'https://api.goshippo.com'

const AVERAGE_ITEM_WEIGHT_OZ = 8
const MIN_PARCEL_WEIGHT_OZ = 4
// A padded mailer/small box big enough for singles, binders, or a sealed
// box - one flat size stands in for real per-product dimensions.
const PARCEL_DIMENSIONS_IN = { length: '12', width: '9', height: '4' }

function estimatedWeightOz(totalQuantity) {
  return String(Math.max(MIN_PARCEL_WEIGHT_OZ, totalQuantity * AVERAGE_ITEM_WEIGHT_OZ))
}

// The store's ship-from address. Not a secret, so it lives in
// wrangler.jsonc's `vars` block alongside SUPABASE_URL - fill in the real
// address there (and in .dev.vars for local dev) before this can rate
// anything.
function originAddress(env) {
  return {
    name: env.STORE_NAME || 'Store',
    street1: env.STORE_ADDRESS_STREET1,
    city: env.STORE_ADDRESS_CITY,
    state: env.STORE_ADDRESS_STATE,
    zip: env.STORE_ADDRESS_ZIP,
    country: env.STORE_ADDRESS_COUNTRY || 'US',
  }
}

// destination: { street, city, state, zipCode, country }
// Returns [{ id, label, description, amount }], where `id` is Shippo's
// rate object_id. It's round-tripped back to getRateById() below when the
// order is actually charged, so the exact live quote the customer saw
// gets billed, rather than trusting a client-supplied dollar amount or
// re-running a fresh rate search that could come back different.
export async function getShippingRates({ env, destination, totalQuantity }) {
  const shipment = {
    address_from: originAddress(env),
    address_to: {
      name: destination.name || 'Customer',
      street1: destination.street || undefined,
      city: destination.city || undefined,
      state: destination.state,
      zip: destination.zipCode,
      country: (destination.country || 'US').toUpperCase(),
    },
    parcels: [
      {
        ...PARCEL_DIMENSIONS_IN,
        distance_unit: 'in',
        weight: estimatedWeightOz(totalQuantity),
        mass_unit: 'oz',
      },
    ],
    async: false,
  }

  const res = await fetch(`${SHIPPO_API_URL}/shipments/`, {
    method: 'POST',
    headers: {
      Authorization: `ShippoToken ${env.SHIPPO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(shipment),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Shippo shipment request failed (${res.status}): ${detail}`)
  }

  const data = await res.json()
  const rates = (data.rates || []).filter((rate) => rate.amount)

  return rates
    .sort((a, b) => Number(a.amount) - Number(b.amount))
    .map((rate) => ({
      id: rate.object_id,
      label: `${rate.provider} ${rate.servicelevel?.name || ''}`.trim(),
      description: rate.estimated_days
        ? `Estimated ${rate.estimated_days} business day${rate.estimated_days === 1 ? '' : 's'}`
        : rate.duration_terms || '',
      amount: Number(rate.amount),
    }))
}

// Re-fetches one specific previously-quoted rate by its Shippo object_id.
// This is what makes the charge trustworthy: rather than trusting the
// dollar amount the client sends back, the server asks Shippo directly
// "is this still a real rate, and what does it actually cost". Returns
// null if the rate id is unknown or has expired.
export async function getRateById(env, rateId) {
  if (!rateId) return null
  const res = await fetch(`${SHIPPO_API_URL}/rates/${encodeURIComponent(rateId)}/`, {
    headers: { Authorization: `ShippoToken ${env.SHIPPO_API_KEY}` },
  })
  if (!res.ok) return null
  const rate = await res.json()
  if (!rate.amount) return null
  return { id: rate.object_id, amount: Number(rate.amount) }
}
