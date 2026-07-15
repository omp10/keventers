# Analytics & Reporting Engine (Phase 4.11)

All dashboards, KPIs and reports are served from **read-optimized projection
collections** — never computed live from Orders/Payments/Kitchen/etc. The engine
is **projection-based + event-driven**: it consumes domain events from every
module and maintains pre-aggregated projections; the only path that ever reads
transactional data is the sanctioned **rebuild / reconciliation** job.

## Two projection shapes (extensible by design)

Rather than a collection per metric, the engine uses two generic, indexed shapes
discriminated by `domain`:

- **`TimeBucketProjection`** — a time-series counter: one doc per
  `(scope, domain, period, periodKey)` with a flexible `metrics` map. Powers every
  time-based dashboard (revenue/orders/payments/notifications/qr by
  hour/day/week/month/year + lifetime). Day docs also carry `hourly[24]` /
  `weekday[7]` histograms for peak-hour / peak-day analysis.
- **`EntityProjection`** — a per-entity counter: one doc per
  `(scope, domain, entityType, entityId)`. Powers leaderboards — best/worst
  products, category revenue, modifier/add-on usage, chef + station performance,
  table utilization, payment-provider distribution, notification-channel
  performance.

**Adding a metric** = incrementing a new key in a pure updater. **Adding a
domain/dashboard** = registering a new event consumer + updater. No existing
service changes — the mandated extensibility requirement.

## Time-series without scanning history

Every event stamps ONE key per granularity (`hour/day/week/month/year/all`), so a
range query is an indexed `(domain, period, periodKey ≥ from ≤ to)` scan over a
compact set of pre-aggregated buckets — daily / weekly / monthly / yearly / custom
ranges all read directly, never touching the order history. Averages and rates
(AOV, SLA compliance, delivery rate, conversion rate) are **derived** from stored
sum+count pairs at read time — never stored as mutable averages.

## Event-driven projection flow

```
domain event ──► handler enriches (getByIdSystem / kitchen entry / cached scope resolver)
                                     │  pure UPDATER → instruction[]
                                     ▼
             ProjectionService.apply(scope, instructions, at)
                                     │  fan each bucket instruction across hour/day/week/month/year/all
                                     ▼
             TimeBucketProjection + EntityProjection  (atomic upsert-$inc)
                                     └─► invalidate KPI cache + publish AnalyticsProjectionUpdated
```

Events are thin (ids + a scope fragment), so a handler enriches purely to compute
increments: orders/sales/products load the order via the Order module's trusted
`getByIdSystem`; kitchen loads the queue entry via a trusted seam (chef/station/
SLA) + a preparing→ready prep-time correlation in Redis; payment/loyalty/
notification/QR resolve the org from a bare restaurantId/branchId via a **cached
scope resolver**. Updaters are PURE (`event → instruction[]`), fully unit-tested
in isolation. Handlers are defensive — a failure is logged, never thrown back into
the publisher.

### Domains & sources

| Domain | Source events | Highlights |
| --- | --- | --- |
| Sales | order.completed, payment.refund_completed | gross/net/tax/discount/refund, AOV, revenue by hour/day/week/month |
| Orders | order.placed/completed/cancelled | counts, avg prep/completion, peak hours/days |
| Products | order.completed | best/worst sellers, product/category revenue, modifier/add-on usage |
| Kitchen | kitchen.order.{preparing,ready}, kitchen.sla.breached | avg prep, SLA compliance, delayed orders, chef + station performance |
| Customers | customer.created/merged, loyalty.earned/redeemed, tier.changed | new/returning, loyalty earned/redeemed, tier upgrades |
| Payments | payment.captured/failed, refund_completed | success/failure/refund rate, Razorpay vs PhonePe volume |
| Notifications | notification.queued/sent/delivered/read/failed | delivery/read/failure rate, channel performance |
| QR / Tables | qr.scanned, session.created/completed/expired | scan→session→order funnel, conversion, table utilization |

## Rebuild & reconciliation (safety)

The **only** sanctioned transactional-read path:

- **Full rebuild** — clears the order-derived projections (sales/orders/products)
  for a restaurant and replays its authoritative order history via the trusted
  `listForRestaurantSystem` seam. Idempotent (clear → replay).
- **Reconciliation** — compares projection totals (net revenue, completed orders)
  against authoritative order sums for a range and **reports mismatches beyond a
  configurable tolerance WITHOUT mutating data**, publishing
  `AnalyticsReconciliationFailed` on drift. A daily reconciliation sweep runs as a
  BullMQ repeatable job.

Every run is tracked in `RebuildRun` (status, counts, mismatches) and audit-logged.
Because in-process events deliver exactly once, projections stay accurate; when
drift is ever detected, reconciliation surfaces it and a rebuild corrects it.

## Multi-tenancy, caching, performance

Every projection is org+restaurant scoped (branch where applicable); scoped repos
whitelist tenant fields so analytics never leaks across tenants. Dashboard KPI
widgets are cached in Redis and invalidated by the projection writer on every
update. Projections are optimized for reads (multiple granularities maintained on
write) to serve high-frequency dashboard refreshes over millions of historical
events without scanning them.

## Exports

Report exports go through a pluggable **Exporter** interface. **CSV** is fully
implemented (dependency-free, RFC-4180 escaping); **Excel** and **PDF** are
declared interfaces with inert stubs — registering a concrete renderer enables
them with no change to the export service.

## API surface

| Audience | Endpoints |
| --- | --- |
| Restaurant | `/restaurant/analytics/{dashboard,sales,orders,products,customers,kitchen,payments,qr}`, `/export`, `POST /rebuild`, `POST /reconcile`, `GET /runs` |
| Admin | `/admin/analytics/{platform,restaurants,revenue,providers}` |

Restaurant analytics require a management role + `analytics:read`; exports need
`analytics:export`; rebuilds need `analytics:rebuild`. Platform analytics require
the Super Admin. Projection rebuilds, manual rebuilds and export generation are
audit-logged.

## Events published

`AnalyticsProjectionUpdated`, `AnalyticsRebuildStarted`,
`AnalyticsRebuildCompleted`, `AnalyticsReconciliationFailed`.

## Permissions

The `011-analytics-core` seeder adds `analytics:read/export/rebuild`. No data is
seeded — projections build from live events and are rebuildable on demand.
