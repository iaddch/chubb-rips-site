// Mock sales tax matrix keyed by US state, using each state's published
// average combined state + local rate. This is a simplification (no
// per-county/city jurisdiction lookups, no product tax-exemption rules)
// but keeps the estimate in the right ballpark without a paid tax API.
// Swapping in Stripe Tax/TaxJar later means replacing the body of
// getTaxForAddress() with an API call - callers don't need to change.

const STATE_TAX_RATES = {
  AL: 0.0924, AK: 0.0176, AZ: 0.0840, AR: 0.0946, CA: 0.0868,
  CO: 0.0778, CT: 0.0635, DE: 0, FL: 0.0705, GA: 0.0742,
  HI: 0.0444, ID: 0.0603, IL: 0.0886, IN: 0.0700, IA: 0.0694,
  KS: 0.0869, KY: 0.0600, LA: 0.0955, ME: 0.0550, MD: 0.0600,
  MA: 0.0625, MI: 0.0600, MN: 0.0781, MS: 0.0707, MO: 0.0839,
  MT: 0, NE: 0.0694, NV: 0.0823, NH: 0, NJ: 0.0663,
  NM: 0.0761, NY: 0.0852, NC: 0.0699, ND: 0.0696, OH: 0.0723,
  OK: 0.0895, OR: 0, PA: 0.0634, RI: 0.0700, SC: 0.0746,
  SD: 0.0640, TN: 0.0955, TX: 0.0820, UT: 0.0719, VT: 0.0622,
  VA: 0.0570, WA: 0.0925, WV: 0.0655, WI: 0.0543, WY: 0.0533,
  DC: 0.0600,
}

// destination: { state, country }, subtotal: trusted server-computed
// taxable amount (product subtotal - shipping is not taxed here, since
// most states that tax shipping are a further jurisdiction-specific
// exception this mock doesn't model).
export function getTaxForAddress({ subtotal, destination }) {
  const country = (destination?.country || 'US').toUpperCase()
  if (country !== 'US') {
    return { rate: 0, amount: 0, jurisdiction: country }
  }

  const state = (destination?.state || '').trim().toUpperCase()
  const rate = STATE_TAX_RATES[state] ?? 0
  const amount = Math.round(subtotal * rate * 100) / 100

  return { rate, amount, jurisdiction: state || null }
}
