# Customer Platform & Loyalty Engine (Phase 4.9)

Manages the full customer lifecycle — from anonymous guest sessions through
registered accounts, loyalty, rewards, referrals and (future-ready) wallets. It
is **event-driven**: it CONSUMES Order / Payment / QR events and NEVER calls
those services to drive them. Customers are **restaurant-scoped** (organization +
restaurant); orders remain branch-scoped. All money is integer minor units
(reusing `Money` semantics); loyalty points are integers.

## Entities

| Model | Scope | Notes |
| --- | --- | --- |
| `Customer` | org + restaurant + `userId` (unique) | Profile snapshot, preferences, marketing/consent, **stats projection**, immutable timeline. Origin = guest_session / registered. |
| `CustomerAddress` | per customer | Home/Work/Other, GeoJSON-ready for future delivery. |
| `LoyaltyAccount` | per customer (unique) | Fast-read projection: balance, lifetime points, tier. Rebuildable from the ledger. |
| `LoyaltyLedger` | per customer | **IMMUTABLE** append-only points ledger — the source of truth. |
| `Reward` | restaurant | Points-priced catalog: discount / free-product / cashback / coupon. |
| `RewardRedemption` | per customer | Immutable, **Pricing-Engine-ready** redemption artifact + voucher code. |
| `Referral` | restaurant | Design-only: code, tracking, completion state machine. |

MongoDB is designed for millions of customers: compound indexes for CRM
listing (`restaurant, accountStatus, createdAt`), loyalty reporting
(`restaurant, tier` / `restaurant, balance`), spend ranking
(`restaurant, stats.lifetimeSpend`) and the ledger statement
(`customer, createdAt`) + expiry sweep (`expiresAt, type`).

## Loyalty ledger — the immutable source of truth

Every earn, redeem, adjustment, expiration, bonus and reversal APPENDS one ledger
entry; the account balance is the **signed sum** of `points` (and can be rebuilt
from the ledger via `rebuild`). The displayed balance is always derived, never a
free-standing mutable number. Immutability is enforced at BOTH the model
(pre-hooks block every update path) and repository (update methods reject) layers.

**Idempotency** is structural: `(customerId, source.type, source.id)` is a unique
(partial) index. A replayed `PaymentCaptured` — or a double-submitted redemption
— can never double-post. Every points mutation runs under a per-customer
distributed lock and snapshots `balanceAfter` for O(1) statements.

```
earn  (+)  ── from captured spend            source: payment:<paymentId>
redeem(−)  ── to claim a reward              source: reward:<code>
adjust(±)  ── staff/admin manual correction  source: manual        (audited)
expire(−)  ── aged lots, balance-capped      source: expiration:<lotId>
bonus (+)  ── signup / referral / campaign   source: signup|referral:<id>
reversal(±)── clawback on refund             source: refund:<refundId>
```

### Tiers (event-driven)

`BRONZE → SILVER → GOLD → PLATINUM`, keyed off **lifetime earned points**
(thresholds are env-tunable). Redeeming spends the *balance* but never lowers
lifetime points, so a redemption never demotes a customer. Crossing a threshold
publishes `TierChanged` + a timeline entry.

### Expiration

A sweep (`expireDue`) processes each aged earn/bonus lot exactly once (idempotent
by lot id), capping expiration at the current balance so it never goes negative —
a balance-capped, lot-marked, FIFO-approximate policy.

## Guest → Customer migration (merge-safe)

On `session.linked_account`, the platform resolves the session's restaurant,
idempotently materializes the `Customer` (unique `(org, restaurant, userId)`
upsert), records the merge in the immutable timeline, and **re-projects analytics
from the authoritative order history** (a one-time SET, not a per-request
recompute). Because the Order module already re-attributes historical orders to
the `customerUserId` on the same event, **no order history is ever lost**, and
re-linking never creates duplicates or orphans.

## Event-driven analytics projections

Lifetime spend, order counts, average order value, visit frequency, last visit
and favorite products are maintained by consuming events — **never recomputed
from raw orders on a profile read**:

| Event | Projection |
| --- | --- |
| `OrderCompleted` | order/visit counters, favorites (bounded top-N), last visit |
| `PaymentCaptured` | lifetime spend += amount, loyalty **earn** (idempotent by paymentId) |
| `RefundCompleted` | lifetime spend −= amount, loyalty **reversal** (idempotent by refundId) |
| `session.linked_account` | materialize + merge + one-time history rebuild |

Payment/order events carry only ids + scope, so a handler loads the order once
via the Order module's trusted `getByIdSystem` read seam to resolve the customer
+ amounts. Handlers are defensive (a failure is logged, never thrown back into
the publisher) and no-op when the order has no linked customer.

## Rewards → Pricing Engine

A redemption debits points via the loyalty engine and issues an immutable
`outcome` — a snapshot of the reward's value expressed in **basis points OR minor
units** (+ free product / cashback), plus a single-use `RWD-…` voucher code — so
the Cart/Pricing Engine can apply it later. This module **never computes an order
price**.

## API surface

| Audience | Endpoints |
| --- | --- |
| Customer (guest-linked) | `GET/PATCH /customer/profile`, `GET /customer/orders`, `GET /customer/loyalty`, `GET /customer/rewards`, `POST /customer/redeem`, `GET /customer/redemptions`, `GET/PATCH /customer/preferences`, `/customer/addresses` CRUD |
| Restaurant | `/restaurant/customers` (+ `/:id`, `/:id/ledger`, `/:id/loyalty/adjust`), `/restaurant/loyalty`, `/restaurant/rewards` CRUD |
| Admin | `/admin/customers` (+ GDPR erase), `/admin/loyalty`, `/admin/rewards` |

Customer endpoints are **guest-session authenticated AND require a linked
account** (scope + `userId` come from the signed guest token). Sensitive loyalty
adjustments and reward management require fine-grained permissions
(`loyalty:adjust`, `reward:manage`) on top of the staff role. Manual adjustments,
tier changes, reward grants and customer merges are all audit-logged.

## Redis

Best-effort caching (TTL-bounded + event-invalidated): customer profile, loyalty
summary, active reward catalog. Per-customer ledger + merge locks serialize
concurrent points mutations. A Redis outage degrades to a DB read, never an error.

## Security & GDPR

Restaurant-scoped repositories whitelist the tenant fields in every paginate
(cross-tenant-leak fix), so customer data never leaks across restaurants. GDPR
erasure scrubs PII while RETAINING the (anonymized) record so the immutable
loyalty/financial ledgers stay consistent. Soft delete + consent tracking +
marketing opt-in are first-class.

## Future CRM readiness

`WalletProvider` (stored value / cashback / gift cards) and `CampaignStrategy`
(segmentation, birthday rewards, win-back, abandoned-cart recovery) are declared
extension points with inert no-op defaults. A campaign engine subscribes to the
customer/loyalty/tier events and drives grants through the loyalty engine's public
`grantBonus` / `completeReferral` seams — no change to the customer core.

## Events published

`CustomerCreated · CustomerUpdated · CustomerMerged · CustomerDeleted ·
LoyaltyPointsEarned · LoyaltyRedeemed · LoyaltyExpired · LoyaltyAdjusted ·
TierChanged · RewardRedeemed · ReferralCreated · ReferralCompleted`.

## Permissions

Core `customer` CRUD comes from the identity catalog. The `009-customer-core`
seeder adds `customer:read/manage`, `loyalty:read/adjust`,
`reward:read/manage/grant`.
