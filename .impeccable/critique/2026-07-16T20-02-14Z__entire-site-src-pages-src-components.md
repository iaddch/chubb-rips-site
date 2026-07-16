---
target: entire site (src/pages, src/components)
total_score: 21
p0_count: 2
p1_count: 2
timestamp: 2026-07-16T20-02-14Z
slug: entire-site-src-pages-src-components
---
Method: dual-agent (A: design-review sub-agent · B: detector/evidence sub-agent)

## Design Health Score — 21/40 (Acceptable band)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | No cart badge/indicator in Header.jsx; no feedback loop for "did my action register" because Add to Cart doesn't exist |
| 2 | Match System / Real World | 2/4 | Full Stripe cart/checkout is built, but ProductDetail's primary CTA is "Ask about this item on Instagram" — two conflicting purchase models shown at once |
| 3 | User Control and Freedom | 2/4 | AdminRoute "Access denied" screen is a dead end with no way out; `window.confirm` for cart-clear but zero confirmation for admin sale delete |
| 4 | Consistency and Standards | 3/4 | Header.jsx uses `bg-black` while the rest of the app runs a slate-50/white "corporate" theme — jarring at the one persistent chrome element |
| 5 | Error Prevention | 2/4 | `SalesPage.handleDeleteSale` permanently deletes a sales record on one click, no confirm, no undo |
| 6 | Recognition Rather Than Recall | 2/4 | No persistent cart count anywhere; Cart.jsx promises "Shipping: calculated at checkout" but Checkout.jsx never shows or computes one |
| 7 | Flexibility and Efficiency | 1/4 | No quick-add from the catalog grid, no add-to-cart at all, no guest checkout |
| 8 | Aesthetic and Minimalist Design | 3/4 | Clean spacing/typography, undercut by a generic eyebrow-label/glow-orb template repeated on every section |
| 9 | Error Recovery | 3/4 | Good humanized copy on most empty/error states, but SalesPage/InventoryPage surface raw `error.message` from Supabase directly to users |
| 10 | Help and Documentation | 1/4 | No FAQ, shipping/returns policy, condition/set glossary, or support contact anywhere |
| **Total** | | **21/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**Start here: does this look AI-generated?** Partial — yes on visual language, no on code craft.

**LLM assessment**: The code itself is clean and well-organized, not slop. But the *visual template* reads as generic AI-dashboard output: tiny uppercase tracked "eyebrow" labels above nearly every section (`CHUBB'S VAULT`, `COMMUNITY`, `DASHBOARD`, `EVENT DETAIL`, `INVENTORY FORM`, `CATALOG`, `ANALYTICS`, `COLLECTION MANAGER` — eight-plus instances of the identical `text-xs font-bold tracking-[0.16-0.22em] text-indigo-600` pattern used as structural scaffolding, not a deliberate device); decorative glow-orb blur circles in InventoryPage.jsx (`absolute -right-12 -top-20 size-64 rounded-full bg-indigo-500/20 blur-3xl`) with no functional purpose; near-identical card-grid treatment reused on product cards, event cards, and every admin panel. The theme is literally self-labeled `/* Corporate Professional palette */` in `src/index.css:9` — navy/emerald/indigo — for a Pokémon card-rip shop aimed at collectors, not a B2B SaaS tool.

**Deterministic scan**: `detect.mjs` found 5 hits across 2 rules in `src/pages` + `src/components` (exit code 2):
- `gray-on-color` ×3 — Catalog.jsx:138, Header.jsx:52 (×2)
- `ai-color-palette` ×2 — ProductDetail.jsx:98 (indigo eyebrow label), SalesPage.jsx:348 (indigo gradient bar fill)

Cross-checked against source: the 3 `gray-on-color` hits are **false positives** — the flagged class pairs come from opposite branches of a ternary (Catalog.jsx's in-stock/sold-out badge) or from Tailwind variant selectors that never render simultaneously (Header.jsx's `hover:`/`data-active:` states). The 2 `ai-color-palette` hits are **real and corroborate the LLM finding independently** — the indigo-600 kicker on ProductDetail.jsx:98 is exactly the eyebrow-label pattern flagged manually above, and the indigo gradient bar in SalesPage's chart is genuine violet/indigo AI-palette usage.

**Visual overlays**: Not available. No browser automation tool was exposed in this environment (no headless-Chromium libs, no Playwright/DevTools MCP), so no live-page injection or `[Human]`-tab overlay could run. This is a real gap, not a skipped convenience — findings below that would normally get visual confirmation are backed by source-level contrast math instead (see Persona Red Flags, Sam).

## Overall Impression

The individual craftsmanship is good — empty states, loading states, and copy are consistently humane, and the checkout math is architected correctly (server-side price recomputation, RLS-backed admin gating). But the site cannot currently sell anything: there is no way to add a product to the cart, so the fully-built Stripe checkout stack is unreachable. The single biggest opportunity is closing that gap — everything else (visual identity, mobile auth, confirmation UX) is real but secondary to a site that cannot transact.

## What's Working

1. **Consistently excellent empty/loading/error states.** Nearly every page has a bespoke, human-voiced empty/error state with a retry CTA — rare to see this level of consistency across an entire app.
2. **Careful handling of real-world data overflow.** `line-clamp-2 min-h-12` on product names reserves height to prevent layout shift; `break-words`/`text-pretty`/`text-balance` are used correctly on reviews and headings.
3. **Security-conscious architecture.** Checkout totals are explicitly recomputed server-side from live prices before charging, and admin UI gating is documented as UX-only, backed by Supabase RLS — the design correctly treats client-side admin/price state as decorative, not authoritative.

## Priority Issues

**[P0] The store has no way to add anything to the cart.** `useCartStore.addItem` is defined in `store/index.js:42` but never called from Catalog.jsx or ProductDetail.jsx. Git history shows commit `90cbcf2` deleted `handleAddToCart` and the "Add to Cart" section from ProductDetail.jsx, replacing it with an outbound Instagram-DM button. Cart.jsx, Checkout.jsx, ThankYou.jsx, OrderConfirmation.jsx, and the full Stripe payment-intent flow are fully built and polished but structurally unreachable.
**Why it matters**: A visible cart/checkout implies self-serve purchase; shipping that alongside an Instagram-only CTA wastes user trust and burns maintenance effort on a path nobody can reach.
**Fix**: This is a business-model fork, not a styling choice — restore a working Add to Cart entry point on Catalog/ProductDetail if self-serve checkout is the intended model, or remove the cart/checkout/Stripe stack if Instagram DM is the real sales channel. Needs your call before either path gets built.
**Suggested command**: `/impeccable craft` (once the direction is chosen, to wire up the entry point end-to-end)

**[P0] Mobile users cannot sign in, sign out, or reach the dashboard.** In `Header.jsx:90-101`, Sign out, Dashboard, and Sign In all carry `hidden ... sm:inline-flex` (display:none below 640px). The mobile hamburger menu only renders shop nav links, not auth links. A phone user has no UI path to `/login` short of typing the URL.
**Why it matters**: Combined with the P0 above, mobile visitors are fully locked out of authentication — the only always-visible header action on a 390px viewport is an outbound "Follow our Instagram!" link.
**Fix**: Add auth actions (Sign In / Dashboard / Sign Out) into the mobile hamburger menu alongside the nav links.
**Suggested command**: `/impeccable adapt`

**[P1] Two redundant post-purchase screens, plus a shipping promise that's never kept.** ThankYou.jsx and OrderConfirmation.jsx show near-identical order recaps in different layouts; ThankYou links to OrderConfirmation as "View Order Details," creating a confusing double-confirmation. Separately, Cart.jsx:91 tells the user "Shipping: Calculated at checkout," but Checkout.jsx's order summary never adds or displays a shipping line.
**Why it matters**: Splits the one emotional "peak" of the purchase flow into two weaker beats, and breaks a promise made one screen earlier.
**Fix**: Merge into a single confirmation screen; implement shipping calculation or remove the "calculated at checkout" copy.
**Suggested command**: `/impeccable distill`

**[P1] Visual identity reads as generic AI-dashboard, not Pokémon collector shop.** Repeated eyebrow-label scaffolding, decorative blur-orb glassmorphism, and a self-labeled "Corporate Professional" navy/emerald/indigo palette — corroborated independently by the detector's `ai-color-palette` hits. Nothing in the visual language signals card-collecting, rarity, or pack-rip excitement.
**Why it matters**: For a hobby-driven audience, generic SaaS visual language undersells the product and blends in rather than building brand identity.
**Fix**: Drop the eyebrow-label crutch site-wide, replace decorative gradients/orbs with something that reflects the hobby (card texture, set iconography, rarity cues).
**Suggested command**: `/impeccable delight`

**[P2] Inconsistent or missing destructive-action confirmation.** Cart's "Clear cart" uses a native `window.confirm` — stylistically inconsistent with the app's custom alert boxes elsewhere. SalesPage's `handleDeleteSale` has no confirmation at all before permanently deleting a sales record. AdminRoute's "Access denied" screen has no link back to the store.
**Why it matters**: An admin can permanently lose a sales record with one misclick; the access-denied dead end strands legitimate users.
**Fix**: Standardize on one custom confirm pattern, apply it to every destructive action, add a "back to store" link to Access Denied.
**Suggested command**: `/impeccable harden`

## Persona Red Flags

**Alex (Power User)**: No add-to-cart button exists anywhere — the fastest path to purchase today is "wait for a DM reply on Instagram," the opposite of what Alex wants. No quick-add from the catalog grid even if it existed; every purchase intent requires a full navigation to ProductDetail.

**Sam (Accessibility-Dependent)**: Star ratings are raw Unicode glyphs (`'★'.repeat(...)`) with no `aria-label` in ReviewList.jsx:15-18 and ProductDetail.jsx:86 — a screen reader announces nothing meaningful. Measured contrast of the amber-500 star color on white is **2.15:1**, far below WCAG AA's 4.5:1 — the primary visual channel for rating info is nearly invisible for low-vision users, with no numeric fallback. `text-emerald-600` in-stock status text (ProductDetail.jsx:87) measures **3.77:1**, also failing AA. Mobile sign-in/out controls vanish entirely with no keyboard/screen-reader-reachable equivalent.

**Casey (Distracted Mobile)**: Cannot sign in or out on mobile at all (see P0 above); the only always-visible header action on a 390px viewport pulls Casey off-site to Instagram rather than toward a purchase. Catalog's filter sidebar isn't a mobile drawer — it stacks full-width above the product grid, forcing a scroll past search + two price inputs + a toggle before seeing a single product.

## Minor Observations

- `text-slate-500` (used pervasively for timestamps, set names, helper text) measures 4.55–4.76:1 on white/slate-50 — technically passes AA but sits right at the floor as the *only* body-copy color used.
- Raw Supabase error messages are surfaced directly to end users in SalesPage.jsx and InventoryPage.jsx (`setError(error.message)`) — risk of leaking Postgres constraint text.
- Sold-out products get the same "Ask about this item on Instagram" CTA as in-stock ones — no state change communicates unavailability at the point of action.
- Placeholder text contrast (`slate-400` on white inputs) is 2.56:1 — low, though commonly tolerated for placeholders.

## Questions to Consider

- The site ships a fully-built Stripe checkout behind zero working entry points. Is this actually meant to be self-serve e-commerce, or is the real transaction model "DM to buy on Instagram" with cart/checkout left as unfinished infrastructure?
- Every dashboard-style section reaches for the same tiny-uppercase-eyebrow-over-headline template. If you deleted every eyebrow label site-wide, would collectors miss the labeling, or would product name/price/condition get room to breathe?
- Two different screens congratulate a buyer for the same order — is the job "deliver an emotional payoff" or "deliver a printable receipt," and could one screen honestly do both?
