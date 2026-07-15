# Keventers Smart Ordering Platform — Backend

Enterprise modular-monolith backend. **Phase 2 delivers the infrastructure foundation only** — no business modules. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design.

## Requirements

- Node.js ≥ 18.18
- MongoDB & Redis (run locally, or via `docker-compose`)

## Getting started

```bash
cp .env.example .env      # then edit secrets
npm install
npm run dev               # nodemon
# or
npm start
```

### With Docker

```bash
docker compose up --build
```

Brings up the API, MongoDB and Redis on one network with health-gated startup.

## Operational endpoints

| Endpoint  | Purpose                                            |
| --------- | -------------------------------------------------- |
| `/health` | Liveness — process is up (no I/O).                 |
| `/ready`  | Readiness — verifies server + MongoDB + Redis.     |
| `/metrics`| Prometheus metrics.                                |
| `/docs`   | Swagger UI (operational + Identity module).        |

## Business API — Identity module (`/api/v1/identity`)

| Group         | Endpoints                                                                 |
| ------------- | ------------------------------------------------------------------------- |
| `auth`        | `register`, `login`, `refresh`, `me`, `logout`, `logout-all`, `password/change`, `password/forgot`, `password/reset` |
| `users`       | CRUD + `disable`/`enable`, `roles`, `permissions`, `profile` (paginated list with filter/search/sort) |
| `roles`       | CRUD + role `permissions` add/remove                                      |
| `permissions` | CRUD                                                                       |
| `staff`       | create (user+staff), list, get, update                                    |

All non-auth endpoints require a Bearer access token and the appropriate `identity:*` permission.

## Business API — Organization / Restaurant / Onboarding

Multi-tenant module: every business entity belongs to an **Organization**; access is
tenant-scoped via **Memberships** (Platform Super Admin → all; Org Admin → their org;
Restaurant Manager → assigned restaurants). Cross-tenant access is blocked.

| Group | Endpoints |
| --- | --- |
| Public | `POST /api/v1/public/register-restaurant` (multipart; logo + documents) |
| Admin onboarding | `GET /admin/onboarding/applications[/:id]`, `POST /admin/onboarding/:id/{approve,reject,request-information}` |
| Admin orgs | `/api/v1/admin/organizations` CRUD + `:id/{suspend,activate,subscription}` |
| Restaurant | `/api/v1/restaurant/{profile,settings}`, `/onboarding[/start,/step,/complete]`, `/branches`, `/staff` |

**Lifecycle:** `DRAFT → PENDING → UNDER_REVIEW → APPROVED/REJECTED`, then on approval the
tenant is provisioned (org + restaurant + branch + owner + membership) in `ONBOARDING`,
and the first-login wizard drives it to `ACTIVE`. See [docs/SEEDING.md](docs/SEEDING.md)
for role/permission bootstrap.

## Business API — Restaurant Catalog

The catalog is the foundation every ordering operation (QR, cart, orders, KDS,
inventory, analytics, loyalty, POS) builds on. It **inherits** the organization
module's multi-tenancy — every entity carries `organizationId` + `restaurantId`,
resolved from the tenant context; clients never send tenant identifiers.

Hierarchy: **Menu → Category → Product → Variant / Modifier Group → Modifier / Add-on.**
Categories use a **single self-referencing model** (`parentId=null` = main,
`parentId` set = subcategory) capped at **depth 2** by the service layer.

| Group | Endpoints |
| --- | --- |
| Menus | `/api/v1/restaurant/menus` CRUD + `:id/{publish,archive}` (scheduling, visibility, versioning) |
| Categories | `/api/v1/restaurant/categories` CRUD + `/tree` (main + subcategories) |
| Products | `/api/v1/restaurant/products` CRUD + `:id/{detail,images,availability}` + `/:productId/variants` |
| Variants | `/api/v1/restaurant/variants/:id` (own price/SKU/availability/prep time) |
| Modifiers | `/api/v1/restaurant/modifiers` groups CRUD + `:id/modifiers[/:modifierId]` |
| Add-ons | `/api/v1/restaurant/addons` CRUD (reusable across products) |
| Catalog | `/api/v1/restaurant/catalog` (cached public tree), `/stats`, `/import`, `/export` |
| Admin | `/api/v1/admin/catalog/{stats,menus,products,products/:id}` — Super-Admin inspection only |

Listing endpoints support **pagination / filtering / search / sorting**. The public
catalog tree is served from **Redis** and invalidated by domain events on any change;
administrative (tenant-sensitive) data is never cached. Images go through the Storage
Platform. Inventory + CSV/Excel import-export are **extension points only** this phase.

## Business API — QR Ordering Gateway

The customer entry point: scan a QR → get a guest session. It creates the ordering
**session** and stops there (no cart/orders). Tables, QR codes and sessions are
**branch-scoped** (organization + restaurant + branch), inheriting the org tenancy.

The guest **Session is the primary ordering identity** — Cart, Order, Kitchen and
Payment reference `sessionId`, so a customer can stay anonymous, log in mid-journey,
recover after a refresh, or share a table (multiple sessions) without redesign.

| Group | Endpoints |
| --- | --- |
| Public | `POST /public/qr/scan`, `GET /public/session/:sessionId`, `POST /public/session/recover`, `POST /public/session/end` |
| Tables | `/api/v1/restaurant/tables` CRUD + `:id/status`, `/restaurant/table-groups` CRUD |
| QR | `/api/v1/restaurant/qr` generate + `:id/{regenerate,rotate,enable,disable}`, `/qr/table/:tableId` |
| Sessions | `/api/v1/restaurant/sessions` list/get + `:id/terminate`, `/sessions/release-table` |
| Admin | `/api/v1/admin/{tables,qr,sessions}` — Super-Admin inspection/troubleshooting |

**QR security:** the scannable code is `token.version.signature` — an unguessable
token + HMAC signature verified **offline** (tamper detection) before any DB read;
rotating the version invalidates every printed code, regeneration mints a new token.
**Scan flow:** validate QR → restaurant → branch → table → business hours → QR active
→ create session → issue **guest JWT** (distinct `type`, rejected by staff auth) →
return the full restaurant **context** (menu, currency, tax, hours, branding) so the
frontend needs no extra bootstrap. Redis holds live sessions, table occupancy and the
QR validation cache; the scan endpoint is rate-limited per IP. QR images render via a
pluggable renderer (`qrcode`) and store through the Storage Platform.

## Business API — Cart & Pricing Engine

Two modules: a reusable **Pricing Engine** (the single source of truth for money
math) and a **Cart** that composes it. The cart is owned by a **guest session**
(not a customer) — anonymous ordering, with account-linking that never loses history.

**Money** is always integer **minor units** (paise) — a `Money` value object, no
floating point anywhere. The Pricing Engine composes:
`Σ line(base+variant+modifiers+addons)×qty − discounts(product/menu/restaurant/coupon)
+ service charge + taxes(inclusive|exclusive GST) + fees(future) ± rounding = total`.
Coupons (percentage / fixed / free-item / buy-X-get-Y) are validated **inside** the
engine. Delivery/packaging/platform fees, surge, dynamic pricing and loyalty are
designed-in extension points (pass-through 0 today).

| Endpoint | Notes |
| --- | --- |
| `POST/GET /api/v1/cart` | Create/return the session's single active cart (priced) |
| `POST /cart/items`, `PATCH/DELETE /cart/items/:id` | Add/update/remove — server-side priced |
| `POST /cart/apply-coupon`, `DELETE /cart/remove-coupon` | Coupon (engine-validated) |
| `POST /cart/recalculate` | Re-validate live catalog + recompute |
| `POST /cart/checkout` | **Lock** the cart for checkout (order-conversion boundary) |
| `/api/v1/restaurant/coupons` | Coupon CRUD (Restaurant Manager) |

**Clients never send prices.** Every price is computed server-side from catalog
snapshots frozen at add time (catalog changes don't alter stored cart lines).
Mutations are **serialized** (Redis lock), **optimistically versioned** (send
`If-Match`/`version` — concurrent-device safety, `409` on conflict) and **idempotent**
(`Idempotency-Key` header). Carts expire on inactivity (Redis TTL + sweep →
`CartExpired`). The cart NEVER creates orders — `lockForCheckout()` / `convertToOrder()`
are the clean boundary the Order Engine will consume.

## Business API — Order Management Engine

Transforms a validated cart into a **permanent, immutable order** and owns its
lifecycle. It NEVER computes prices (consumes the Pricing-Engine breakdown
captured on the cart lock) and NEVER creates orders directly. **Checkout flow:**
`getCheckoutCart → cart.lockForCheckout (Pricing Engine runs) → OrderService.create
→ cart.convertToOrder`.

The **Order Aggregate** validates every transition, appends an immutable
timeline, protects invariants and publishes events — controllers never move
status directly. **State machine:** `CREATED → PLACED → CONFIRMED → PREPARING →
READY → SERVED → COMPLETED` (+ `CANCELLED` from PLACED/CONFIRMED/PREPARING;
`COMPLETED → REFUND_PENDING → REFUNDED`). Illegal transitions throw.

| Group | Endpoints |
| --- | --- |
| Customer | `POST /api/v1/orders` (checkout), `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` |
| Restaurant | `/api/v1/restaurant/orders` list/get + `:id/{status,confirm,prepare,ready,serve,complete,cancel,notes,refund/*}` |
| Admin | `/api/v1/admin/orders`, `/admin/orders/:id` (Super-Admin inspection) |

**Immutable snapshots** capture restaurant, branch, session, customer, every
line (product/variant/modifiers/add-ons), prices, taxes, discounts, service
charges, coupon and currency — so future catalog changes never affect a placed
order. **Enterprise order numbers** (`KEV-DIN-20260715-000123`) come from an
atomic per-restaurant-per-day counter; Mongo ids are never exposed. Checkout is
duplicate-safe (per-session Redis lock + unique `cartId` index + `Idempotency-Key`);
transitions are optimistically versioned. Realtime status is pushed over
**Socket.IO** (order/session/branch rooms). On `CONFIRMED` a `kitchen.queue.requested`
event is emitted. Payment + refund + split-bill are **extension points**
(status/events only — no money movement). Every transition, cancellation, refund
request and admin action is audit-logged.

## Business API — Kitchen Display System (KDS)

An event-driven **operational** system that CONSUMES Order events and orchestrates
kitchen workflow — it never writes back to the Order module. On `order.confirmed`
it enqueues a branch-scoped **Kitchen Queue Entry** (idempotent by order), routes
each item to **Stations** (Grill/Fryer/Beverage/…) via configurable rules, tracks
per-transition **timers**, monitors **SLA** targets and broadcasts live over
**Socket.IO**.

Workflow state machine: `PENDING → ASSIGNED → PREPARING → READY → SERVED`
(`PREPARING → RECALLED → PREPARING`, `READY → REFIRED → PREPARING`, `→ CANCELLED`).
Illegal transitions throw; each is serialized per entry + optimistically versioned.

| Group | Endpoints |
| --- | --- |
| Board | `GET /api/v1/restaurant/kitchen/queue` (priority-ordered live board) |
| Stations | `/restaurant/kitchen/stations` CRUD (routing config) |
| SLA | `/restaurant/kitchen/sla` targets (product/category/default) |
| Workflow | `PATCH /restaurant/kitchen/orders/:id/{assign,preparing,ready,served,recall,refire,priority}` |
| Admin | `GET /api/v1/admin/kitchen`, `/admin/kitchen/orders/:id` |

Redis holds the live board (priority ZSET), per-station sets and prep timers.
Socket.IO broadcasts `kitchen:queue_updated|order_assigned|order_preparing|
order_ready|order_served|order_recalled` to **restaurant / branch / station** rooms
(never other tenants). It publishes `kitchen.order.*` + `kitchen.sla.breached`
events; Payments/Notifications/Analytics consume these. Chef auto-assignment is a
pluggable strategy (manual/reassign fully implemented). The Kitchen module itself
is NOT called by others — everything is event-driven.

## Business API — Payment Engine

The **single financial source of truth** — Payment Intents, Payments, an
**immutable** Transaction ledger, Refunds, immutable Invoices, Settlements
(abstraction) and Webhooks. It is **provider-agnostic** (Adapter/Strategy +
`ProviderFactory` registry — Razorpay + PhonePe ship production-ready; new
gateways register with no service change), **never calculates prices** (it
consumes the order's immutable Pricing-Engine snapshot) and **never mutates
orders** — it uses the sanctioned `recordPaymentStatus` seam and publishes
provider-independent events. All money is integer minor units via `Money`.

Provider credentials are encrypted at rest (AES-256-GCM); `resolveProvider()` is
the single decryption site, so services never see secrets. One order supports
**multiple tenders** (split payment, incl. cash). The shared, idempotent settle
path serves both customer-confirm and webhooks. **Webhooks** (`POST
/api/v1/webhooks/{razorpay,phonepe}`, unauthenticated) enforce raw-body signature
verification, replay protection (durable `(provider,eventId)` index + Redis) and
resolve the tenant before verifying.

| Audience | Endpoints |
| --- | --- |
| Customer | `POST /api/v1/payments/create-intent`, `/payments/confirm`, `GET /payments/:id` |
| Restaurant | `/api/v1/restaurant/{payments,transactions,refunds,invoices,payment-config}` |
| Admin | `/api/v1/admin/{payments,transactions,settlements}` |
| Webhooks | `/api/v1/webhooks/{razorpay,phonepe}` (unauthenticated, signature-verified) |

It publishes `payment.{authorized,captured,failed,refund_completed,…}` (never
gateway-specific events) and pushes live payment/refund updates to restaurant
dashboards over Socket.IO. Full design in
[docs/PAYMENT-ENGINE.md](docs/PAYMENT-ENGINE.md).

## Business API — Customer Platform & Loyalty

Manages the full customer lifecycle — anonymous guest → registered customer →
loyalty, rewards, referrals, wallets (future) — as an **event-driven** module that
CONSUMES Order/Payment/QR events and never calls those services. Customers are
**restaurant-scoped**; orders stay branch-scoped; data never leaks across tenants.

Loyalty is an **immutable ledger** (`earn/redeem/adjust/expire/bonus/reversal`) —
the balance is the signed sum of entries and is rebuildable from them; posting is
idempotent by `(customer, source)`, so a replayed `PaymentCaptured` never
double-earns. Tiers (`BRONZE→SILVER→GOLD→PLATINUM`) key off lifetime points and
upgrade via events (redeeming never demotes). Customer statistics (lifetime spend,
order count, AOV, last visit, favorite products) are **event-driven projections**
maintained from `OrderCompleted` / `PaymentCaptured` / `RefundCompleted` — never
recomputed from raw orders on a read. Guest→customer linking is idempotent and
**preserves all order history** (a one-time projection rebuild at merge time).
Rewards redeem into a **Pricing-Engine-ready** artifact; this module never
computes an order price.

| Audience | Endpoints |
| --- | --- |
| Customer | `GET/PATCH /customer/profile`, `/customer/{orders,loyalty,rewards,redeem,preferences,addresses}` |
| Restaurant | `/restaurant/customers` (+ `/:id/ledger`, `/:id/loyalty/adjust`), `/restaurant/{loyalty,rewards}` |
| Admin | `/admin/{customers,loyalty,rewards}` (incl. GDPR erasure) |

It publishes `customer.*` + `customer.loyalty.*` + `customer.tier.changed` events
(Notifications/Analytics/CRM consume these) and exposes `WalletProvider` +
`CampaignStrategy` extension points for future CRM (segmentation, birthday
rewards, win-back) with no core change. Full design in
[docs/CUSTOMER-LOYALTY.md](docs/CUSTOMER-LOYALTY.md).

## Business API — Notification & Communication Engine

Every customer/restaurant/staff/admin notification flows through this
**event-driven** module: it CONSUMES Order/Payment/Kitchen/Customer/Organization
events and is never called by them. Reliability comes from an **outbox pattern** —
the notification intent is persisted (idempotent by a `dedupeKey`) BEFORE any
provider call, a **relay** worker claims pending rows, and a BullMQ **delivery**
worker sends each notification with exponential-backoff retry and a
**dead-letter** for permanent failures, so nothing is lost on a crash.

Channels — **in-app, push, email, SMS, WhatsApp** — dispatch through the Phase-3
Notification Platform interfaces; the active provider per channel (SMTP/Resend,
Twilio, Meta WhatsApp, FCM) is chosen in config and **interchangeable**, so
business services never reference a concrete provider. **Templates** are
versioned + localized (restaurant → org → global resolution, `{{ variable }}`
rendering, built-in defaults). **Preferences** gate delivery per category ×
channel (marketing opt-in; security/system always in-app). In-app notifications
push live over Socket.IO.

| Audience | Endpoints |
| --- | --- |
| Customer | `GET /notifications`, `PATCH /notifications/:id/read`, `GET/PATCH /notifications/preferences` |
| Restaurant | `/restaurant/notifications` (+ `/test`), `/restaurant/notification-templates`, `/restaurant/notification-campaigns` |
| Admin | `/admin/{notifications,notification-campaigns,notification-outbox}` (dead-letter inspect + requeue) |

It publishes `notification.{queued,sent,delivered,read,failed}` for
deliverability analytics. Full design in
[docs/NOTIFICATION-ENGINE.md](docs/NOTIFICATION-ENGINE.md).

## Business API — Analytics & Reporting Engine

All dashboards, KPIs and reports are served from **read-optimized projection
collections** — never computed live from transactional data. The engine is
**projection-based + event-driven**: it consumes domain events from every module
(order/payment/kitchen/customer/loyalty/notification/QR) and maintains
pre-aggregated projections; the only path that reads transactional data is the
sanctioned **rebuild / reconciliation** job.

Two generic, indexed projection shapes cover every domain — a **time-bucketed
counter** (hour/day/week/month/year/lifetime, with hourly/weekday peak histograms)
and a **per-entity counter** (product/chef/station/table/provider/channel
leaderboards). Every event stamps one key per granularity, so ranges read a
compact indexed slice — daily/weekly/monthly/yearly/custom without scanning
history. Averages/rates are derived from sum+count pairs at read time. Pure
per-domain **updaters** translate events into increment instructions, so adding a
metric or dashboard means registering a new consumer/updater — no existing service
changes.

**Reconciliation** compares projections against authoritative order data and
reports drift beyond a tolerance **without mutating anything** (a daily sweep +
on-demand); a **full rebuild** replays the order history to recompute projections.
Reports export via a pluggable exporter (CSV implemented; Excel/PDF interfaces).

| Audience | Endpoints |
| --- | --- |
| Restaurant | `/restaurant/analytics/{dashboard,sales,orders,products,customers,kitchen,payments,qr}`, `/export`, `POST /rebuild`, `POST /reconcile` |
| Admin | `/admin/analytics/{platform,restaurants,revenue,providers}` |

Full design in [docs/ANALYTICS-ENGINE.md](docs/ANALYTICS-ENGINE.md).

## Bootstrapping a fresh install

After deploying, seed the permission catalog, production roles, and the initial
Platform Super Admin:

```bash
# set PLATFORM_ADMIN_NAME / _EMAIL / _PASSWORD in .env, then:
npm run seed
```

The seed is **idempotent** (safe to re-run) and reversible (`npm run seed -- --rollback`).
Full details — roles, permissions, wildcards, customization — in
[docs/SEEDING.md](docs/SEEDING.md).

## Scripts

| Script                 | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start with nodemon.                  |
| `npm start`            | Start the server.                    |
| `npm run seed`         | Bootstrap the platform (see below).  |
| `npm run seed -- --rollback` | Roll back applied seeders.     |
| `npm run lint`         | ESLint.                              |
| `npm run format`       | Prettier write.                      |

## Process management (PM2)

```bash
pm2 start ecosystem.config.js --env production   # clustered, zero-downtime reloads
pm2 reload keventers-api                          # graceful reload
```

## Structure

```
src/
├── config/       # single boundary for process.env (Zod-validated, frozen)
├── core/         # framework kernel
│   ├── di/ logging/ errors/ http/ database/ redis/ health/ swagger/
│   ├── repository/   # BaseRepository + pagination/filter/search/sort/aggregation + transactions
│   ├── service/      # BaseService + pagination/validation/audit/cache/retry/event/tx helpers
│   ├── eventbus/     # in-process event bus: registry, dispatcher, retry, DLQ, serializer
│   ├── cache/        # cache, session store, rate-limit, distributed lock, TTL, invalidation
│   ├── security/     # hashing, encryption, secure tokens, API keys, sanitize, CSRF
│   ├── observability/# metrics, tracing, timers, audit log
│   ├── validation/   # Zod validator + validate middleware
│   └── types/        # pagination, result
├── platform/     # pluggable subsystems (depend on core)
│   ├── auth/         # bcrypt, JWT access/refresh, sessions, RBAC, auth middleware
│   ├── socket/       # Socket.IO bootstrap, auth, namespaces, rooms, Redis adapter
│   ├── storage/      # storage abstraction: local + Cloudinary adapters, S3 interface
│   ├── notification/ # email/SMS/push/WhatsApp channel interfaces + dispatcher
│   └── jobs/         # BullMQ queues, workers, scheduler, retry policies
├── middleware/   # global pipeline (security, cors, logging, metrics, auth, error handler)
├── routes/       # operational routes only (health/ready/metrics)
├── database/seeds# reusable seed-runner infrastructure
├── testing/      # test bootstrap, mock DI container, MockRepository, MockRedis, integration helpers
├── app.js        # Express app factory
└── server.js     # composition root + graceful shutdown
```

## Testing

```bash
npm test          # vitest run
npm run test:watch
```

The testing foundation (`src/testing`) provides `MockRepository`, `MockRedis`, a mock DI
container, and integration helpers so modules can be tested without live MongoDB/Redis.

## Architectural rules (enforced)

- `process.env` is read **only** inside `src/config` (ESLint-enforced).
- No `console.*` — use the Pino logger (ESLint-enforced).
- Controllers hold no business logic; repositories will be the only MongoDB access layer.
