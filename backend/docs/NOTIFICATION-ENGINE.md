# Notification & Communication Engine (Phase 4.10)

Every customer, restaurant, staff and admin notification flows through this
module. It is **entirely event-driven** — it CONSUMES domain events already
published by Order / Payment / Kitchen / Customer / Organization and is never
called by them. Reliability is guaranteed by an **outbox pattern** + a BullMQ
delivery pipeline; providers are **interchangeable** behind the Phase-3
Notification Platform channel interfaces.

## Pipeline (outbox → relay → delivery)

```
domain event ──► handler enriches (getByIdSystem read seam) ──► OUTBOX row (PENDING)   [durable, idempotent by dedupeKey]
                                                                      │
                                     ┌── fast path: enqueue dispatch job ──┐
                                     │                                     ▼
              repeatable RELAY sweep ┴──────────────────────►  outbox.dispatch(row)  [atomic claim PENDING→PROCESSING]
                                                                      │  materialize per-channel Notification docs
                                                                      ▼
                                                          DELIVERY queue (one job / notification)
                                                                      │  platform dispatcher → provider adapter
                                                        success ──────┼────── failure
                                                     SENT/DELIVERED    │   retry w/ exponential backoff (BullMQ)
                                                     + realtime        │   final attempt → FAILED + DEAD-LETTER
```

**Why an outbox?** The notification intent is persisted (PENDING) BEFORE any
external provider call, in the same event-handling step. If the app crashes
between the business event and the provider call, the durable outbox row survives
and the periodic **relay sweep** re-claims it — no notification is ever lost. The
outbox row is idempotent by `dedupeKey` (a stable hash of event + recipient +
natural id), so a replayed domain event never produces a duplicate.

## Reliability details

- **Idempotency** at three layers: Redis dedupe fast-path → unique `dedupeKey` on
  the outbox → unique `(dedupeKey, channel)` on the Notification. A replayed
  `PaymentCaptured` or a double relay never double-sends.
- **Atomic claim**: `outbox.claim` is a `findOneAndUpdate` PENDING→PROCESSING, so
  concurrent relay workers never process the same row twice.
- **Retry + backoff**: the DELIVERY queue uses BullMQ `attempts` +
  exponential backoff. The processor passes `attemptsMade`, so the delivery
  service THROWS to trigger a retry on transient failures and only marks the
  notification `FAILED` + **dead-letters** it on the final attempt.
- **Dead-letter**: permanently failed deliveries land in the
  `notifications:dead-letter` queue AND the notification is `FAILED`; the outbox
  row goes `DEAD`. Admins inspect + requeue via `/admin/notification-outbox`.
- **Delivery lock**: a per-notification Redis lock prevents concurrent delivery.
- Everything Redis is **best-effort** — an outage degrades to the durable MongoDB
  guards (unique indexes, optimistic status), never an error.

## Channels & provider abstraction

Channels: **in-app, push, email, SMS, WhatsApp**. External channels dispatch
through the **platform Notification Registry** (`notificationService.send(type,
message)`); business services depend only on the channel interface and never
reference a concrete provider. The active provider per channel is chosen in
config and registered at boot — interchangeable, add a provider with one factory
entry:

| Channel | Providers (adapters) |
| --- | --- |
| email | **SMTP** (transport-injected) · **Resend** (HTTP) |
| sms | **Twilio** (HTTP) |
| whatsapp | **Meta Cloud API** (HTTP) |
| push | **Firebase Cloud Messaging** (HTTP) |
| in-app | internal (the durable Notification is the delivered artifact + Socket.IO) |

HTTP adapters use the global `fetch` through an injectable client (real in prod,
mocked in tests). A missing credential leaves a channel "not ready" and the engine
simply skips that channel — in-app always works, so notifications degrade
gracefully.

## Templates

Reusable, **versioned**, **localized** templates per `(key, channel, locale)`.
Resolution prefers the most specific active template: restaurant override → org →
platform-global, with locale fallback to `en`. `{{ variables }}` (dotted paths
supported) are filled from the event; unknown tokens render empty (never leak
`{{…}}`). A missing DB template falls back to the built-in platform default, so a
notification never fails for want of a template. The seeder ships global defaults
for Welcome, Order Placed/Confirmed/Preparing/Ready/Completed, Payment
Success/Failed, Refund, Loyalty Earned, Tier Upgraded and Restaurant Approved.

## Preferences

Per-user, per-**category** (order updates / payments / loyalty / marketing /
system / security) channel toggles. Opt-out model for transactional categories;
**marketing is opt-in**; `security`/`system` always deliver in-app. A mute window
suppresses external channels while keeping the inbox record. Push device tokens
live on the preference. At dispatch the candidate channels (from the event map)
are intersected with these preferences.

## Events

Consumes: `RestaurantApproved`, `GuestLinked`/`CustomerRegistered`,
`Order{Placed,Confirmed,Preparing,Ready,Completed}`, `KitchenOrderReady`,
`Payment{Captured,Failed}`, `RefundCompleted`, `LoyaltyPointsEarned`,
`TierChanged`.
Publishes: `NotificationQueued`, `NotificationSent`, `NotificationDelivered`,
`NotificationRead`, `NotificationFailed` (Analytics consumes these for
deliverability reporting).

## Multi-tenancy & security

Every notification/outbox/attempt/campaign is org+restaurant scoped (branch
optional); scoped repos whitelist the tenant fields in every paginate, so data
never leaks across tenants. Manual sends, template/preference/campaign changes are
audit-logged. Provider secrets live only in config and are read solely by the
adapters — never persisted on a document or exposed by a DTO.

## API surface

| Audience | Endpoints |
| --- | --- |
| Customer | `GET /notifications`, `POST /notifications/read-all`, `PATCH /notifications/:id/read`, `GET/PATCH /notifications/preferences` |
| Restaurant | `/restaurant/notifications` (+ `/test`), `/restaurant/notification-templates` CRUD, `/restaurant/notification-campaigns` CRUD |
| Admin | `/admin/notifications`, `/admin/notification-campaigns`, `/admin/notification-outbox` (+ `/:id/requeue`) |

## Permissions

The `010-notification-core` seeder adds `notification:read/send/manage`,
`notification_template:read/manage`, `notification_campaign:read/manage`.

## Tests

Template rendering + resolution/fallback, preference resolution, outbox
(idempotency + claim + reschedule + dead-letter), delivery (success + in-app vs
external + retry-throw + final dead-letter), provider adapters (mocked HTTP),
event consumers (event→outbox mapping + defensive failure), and an HTTP
integration suite for wiring + auth boundaries.
