# Order Management Engine (Phase 4.6)

Transforms a validated cart into a **permanent, immutable order** and owns its
entire lifecycle. It integrates with Cart, the Pricing Engine, the Guest
Session, Catalog, Organization, the Event Bus, Audit, Notification and Socket.IO
platforms — and **never** calculates prices or creates orders directly.

## Checkout — the one true path

```
Guest Session
   ↓
Active Cart
   ↓  CartService.lockForCheckout()   ← the Pricing Engine runs here
   ↓  (immutable pricing breakdown captured on the locked cart)
OrderService.create()                  ← snapshots everything, assigns number
   ↓  CartService.convertToOrder(cartId, orderId)
Order (PLACED)
```

The order **never bypasses the cart** and **never recomputes prices** — it
snapshots the Pricing-Engine breakdown the cart produced at lock time.

### Duplicate-safe

- Per-session Redis lock (`order:checkout:<sessionId>`) — one checkout at a time.
- Unique `cartId` index — one order per cart (the data-layer guarantee).
- Optional `Idempotency-Key` header — replays the stored result on retry.

## Immutable snapshots

Captured at creation so future catalog/restaurant changes never affect a placed
order: **restaurant, branch, guest session, customer (optional), products,
variants, modifier groups, modifiers, add-ons, prices, taxes, discounts, service
charges, coupon, currency**, and the full Pricing-Engine breakdown (integer
minor units).

## Order Aggregate & state machine

The aggregate validates transitions, appends an **immutable timeline**, protects
invariants and publishes events. Controllers never touch status directly.

```
CREATED → PLACED → CONFIRMED → PREPARING → READY → SERVED → COMPLETED
                 ↘ CANCELLED (from PLACED / CONFIRMED / PREPARING)
COMPLETED → REFUND_PENDING → REFUNDED   (or back to COMPLETED on rejection)
```

Illegal transitions throw a domain error. Each transition is **serialized per
order** (Redis lock) and **optimistically versioned** (`transitionWithVersion` —
`409` on conflict), then fans out: domain event, Socket.IO emit, audit log,
realtime cache refresh, best-effort notification. Every timeline entry records
`{ at, actorId, actorType, previousStatus, newStatus, reason, metadata }`.

## Order numbers

Enterprise, human-facing, unique, sortable — e.g. `KEV-DIN-20260715-000123`:
`<prefix>-<channel>-<YYYYMMDD>-<seq6>`. The prefix is configurable
(`restaurant.settings.orderNumberPrefix`, else slug, else `ORD`); the sequence
comes from an **atomic per-(restaurant, day) counter** (`$inc` upsert). Mongo
ObjectIds are never exposed to customers.

## Realtime (Socket.IO)

On each transition the module emits `order:placed|confirmed|preparing|ready|
served|completed|cancelled` to the order room, the guest-session room and the
branch room (staff/KDS). Best-effort — if sockets aren't initialized it no-ops
and never blocks a transition.

## Integration seams (events, not calls)

Future modules consume ORDER EVENTS rather than calling the service:

- **Kitchen** — on `CONFIRMED` the order emits `kitchen.queue.requested`
  (the Kitchen module is NOT implemented here — event only).
- **Payments** — extension point: `order.payment.status`
  (awaiting/authorized/captured/failed) + `OrderService.recordPaymentStatus()`
  (driven by a future Payments module) + `order.payment_updated` events. No
  processing.
- **Refunds** — extension point: request → approve/reject → refunded status
  lifecycle + events (`order.refund_requested|refunded|refund_rejected`). No
  money movement.
- **Split-bill** — `SplitBillStrategy` contract + reserved `splitBill` flag.
- **Notifications / Analytics / Loyalty** — subscribe to the order events.

## Notes & cancellation

- **Notes** are customer/restaurant/kitchen with `public`/`internal` visibility;
  customers never see internal (kitchen) notes.
- **Cancellation** records source (customer/restaurant/platform), reason, actor
  and timestamp. Customers may cancel while PLACED/CONFIRMED; staff up to
  PREPARING.

## Multi-tenancy & security

Every order belongs to organization + restaurant + branch + guest session
(optionally customer). Tenancy is resolved automatically — customers from the
signed guest token (`req.guest`), staff from the tenant context — never from
client ids. Cross-tenant / cross-session access → 403. Customers can never
mutate protected fields (status moves only through guarded transitions).
Duplicate checkout and replay are blocked by the lock + unique index +
idempotency.

## MongoDB

Compound indexes on `(restaurantId,status,createdAt)`, `(branchId,status,
createdAt)`, `(customerUserId,createdAt)`, `(sessionId,createdAt)`; unique
`orderNumber` and `cartId`; soft delete; timeline is an append-only embedded
array. Designed for millions of orders + reporting aggregations.

## Module registration

Registered in `src/modules/index.js` before organization; mounts `/orders`,
`/restaurant/orders`, `/admin/orders`. DI tokens `ORDER_TOKENS`; public barrel
`#modules/order`. Seeder `006-order-core` adds `order:manage`, `order:cancel`,
`refund:request`, `refund:approve`. Additive, non-breaking cart change:
`cartService.getCheckoutCart(scope)` (returns the ACTIVE-or-locked cart for the
Order Engine).

## Testing

- **State machine** (`order-state-machine`): legal/illegal transitions, timeline.
- **Order numbers** (`order-number`): format + atomic uniqueness.
- **Service** (`order.service`): checkout (cart→order), **pricing-snapshot
  immutability**, idempotency (cartId dedupe + key replay), transitions, kitchen
  event on confirm, **version-conflict `409` (concurrency)**, customer/staff
  cancellation rules, cross-session `403`, refund extension lifecycle.
- **DTO** (`order.dto`): note-visibility + snapshot exposure by role.
- **Integration** (`docker compose up mongo redis`): routing/wiring, guest +
  staff + admin auth boundaries, module coexistence.
