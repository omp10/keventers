# Cart & Pricing Engine (Phase 4.5)

Two modules delivered together:

- **`pricing`** — a reusable **Pricing Engine**, the SINGLE SOURCE OF TRUTH for
  every monetary calculation used by Cart, Orders, Payments, Refunds, Analytics,
  Invoices and Loyalty. No other module computes prices.
- **`cart`** — the editable representation of an order, owned by a guest session,
  which composes the Pricing Engine and the Catalog module.

## Money — no floating point, ever

All monetary values are integer **minor units** (paise for INR) via a `Money`
value object (`#modules/pricing` → `Money`). It is immutable, currency-checked,
and expresses percentages in **basis points** (1% = 100 bps) so there is no
fractional-percent float drift. `Money.fromMajor(199.5)` → `19950`. Consuming
modules store and transport the integer `amount`; `major` is display-only.

## The Pricing Engine

Pure and deterministic (`PricingEngine.calculate(request)`), it composes:

```
Σ line(base + variant + modifiers + addons) × quantity      → subtotal
− product − menu − restaurant discounts (cascading)
− coupon (validated in-engine)                              → discountedSubtotal
+ service charge (fixed | percentage, restaurant-config)
+ taxes  (EXCLUSIVE: added | INCLUSIVE: extracted for display)
+ delivery / packaging / platform fees   (future; pass-through 0)
± rounding (to nearest step, e.g. nearest rupee)
= total
```

- **Taxes** are multi-rate (GST CGST/SGST) in exclusive or inclusive mode — always
  computed here, never by a consumer.
- **Coupons** (`percentage`, `fixed`, `free_item`, `buy_x_get_y`) are evaluated by
  the in-engine `CouponEvaluator` with validity/usage/min-subtotal rules.
- **Future extension points** (declared, not implemented): delivery/packaging/
  platform fees (accepted + summed as 0), surge pricing, dynamic pricing, loyalty
  redemption.

Every amount in the returned breakdown is a `Money`; `toPricingBreakdownDTO`
serializes it to `{ amount, currency, major }` with the integer as the source of
truth. Accuracy is covered by exact-integer unit tests.

## Cart

- **Owned by a guest session** (`sessionId`), not a customer — anonymous ordering.
  A `session.linked_account` event links a registered customer to the active cart
  WITHOUT losing history; `session.ended` abandons it.
- **One active cart per session** (partial unique index).
- **Price snapshots**: adding an item resolves the product via the Catalog
  services (never its models) and freezes the component prices (base, variant
  delta, each modifier, each add-on) in minor units. Later catalog changes do not
  mutate stored lines; `POST /cart/recalculate` re-validates against live catalog.
- **Clients never send prices** — only catalog ids + selections + quantity. All
  money is computed server-side by the Pricing Engine.

### Validation before an item is added

Product exists + ACTIVE · variant exists + available · modifier group rules
(required / min / max) · add-on validity · restaurant ACTIVE · branch ACTIVE ·
business hours open · guest session live.

### Lifecycle

```
ACTIVE ──(checkout)──► LOCKED ──► CHECKOUT_PENDING ──► CONVERTED_TO_ORDER
   └──► ABANDONED / EXPIRED
```

`ACTIVE` is the only editable state. `lockForCheckout()` validates + locks the
cart and moves the guest session to `CHECKOUT_PENDING`; `convertToOrder(cartId,
orderId)` (called by the future Order Engine via DI) finalizes and records coupon
redemption. **The cart never creates orders.**

## Enterprise requirements

1. **Optimistic concurrency** — every cart has a `version`; mutations send
   `If-Match`/`version` and the repository does a conditional `{_id, version}`
   write (`409` on conflict), so concurrent devices can't silently overwrite.
2. **Idempotency** — mutation endpoints honour an `Idempotency-Key` header; the
   first result is cached (Redis, per cart) and replayed on retry — no double add.
3. **Cart expiration** — Redis TTL (inactivity) + an `expireStaleCarts` sweep that
   publishes `CartExpired` and frees cache/resources.
4. **Money handling** — the `Money` value object / integer minor units throughout.
5. **Order-conversion boundary** — `lockForCheckout()` + `convertToOrder()` keep
   the cart→order boundary one-directional and clean.

Each mutation is additionally **serialized per cart** with a Redis distributed
lock (read-modify-write atomicity) on top of the optimistic version guard.

## Redis usage

`cart:snapshot:<id>` (active cart cache, sliding TTL) · `cart-mutation:<id>`
(per-cart mutation lock) · `cart:idem:<id>:<key>` (idempotency). No user-specific
sensitive data beyond the cart itself; pricing math is pure (no cache needed).

## Events

`cart.created|updated|item_added|item_updated|item_removed|coupon_applied|
coupon_removed|locked|unlocked|expired|abandoned|converted` and
`coupon.created|updated|deleted|redeemed`.

## Multi-tenancy & security

Every cart belongs to organization + restaurant + branch + guest session, all
resolved from the **guest token** (`req.guest`) — never from client-provided ids.
The repository scopes every query by all four. Cross-tenant/cross-session access
returns 403/404. Coupon management is restaurant-tenant-scoped (Organization Admin
/ Restaurant Manager).

## Module registration

`pricing` and `cart` are registered in `src/modules/index.js` before organization
(pricing before cart, since the cart composes the engine at load). `pricing`
mounts `/restaurant/coupons`; `cart` mounts `/cart`. DI tokens: `PRICING_TOKENS`,
`CART_TOKENS`. Public barrels: `#modules/pricing`, `#modules/cart`. Seeder
`005-pricing-core` adds `coupon:*`. Additive, non-breaking catalog change:
`productService.getForOrdering(scope, productId)` (trusted product detail for the
cart); qr-ordering now also exports `isBranchOpen` for cart business-hours checks.

## Testing

- **Pricing accuracy** (pure): `money`, `pricing-engine` (exact-integer breakdowns
  incl. exclusive/inclusive tax, service charge, discounts, coupons, rounding),
  `coupon-evaluator`, `tax-calculator`, `coupon.service` (tenant isolation).
- **Cart**: `cart-validation.service` (catalog resolution + modifier rules),
  `cart.service` (add/update/remove/coupon, optimistic `409`, idempotency,
  checkout lock — with the REAL Pricing Engine wired in).
- **Integration** (`docker compose up mongo redis`): routing/wiring, guest-token
  requirement, coupon staff-auth, organization-router coexistence.
