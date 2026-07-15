# Deployment & Operations Runbook

Operational guide for running the Keventers backend in production. Pairs with the
architecture docs (`docs/*.md`) and `README.md`.

## Runtime

- Node.js ≥ 18 (ESM, native `fetch`), MongoDB (replica set recommended for
  transactions/change streams), Redis (single or cluster).
- Process manager: PM2 cluster (`ecosystem.config.*`) or Docker (`Dockerfile` —
  tini PID 1, non-root, multi-stage). Compose file wires Mongo + Redis with
  `depends_on: service_healthy`.

## Environment configuration

Config is validated at boot by `src/config/env.schema.js` (zod) — **the process
refuses to start on invalid config**. In `NODE_ENV=production` a `superRefine`
enforces production-conditional strictness (fail-fast, never fail-late):

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGO_URI` | always | fail-fast if missing |
| `REDIS_HOST` / `REDIS_PORT` | always (defaults dev-local) | BullMQ + cache + locks + rate limit |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | always (min 16) | distinct secrets |
| `ENCRYPTION_KEY` | **production** (min 32) | AES-256-GCM for payment credentials; fails at boot in prod if unset |
| `API_KEY_PEPPER` | **production** (min 16) | API-key hashing pepper |
| `CORS_ORIGIN` / `SOCKET_CORS_ORIGIN` | **production: not `*`** | must be an explicit origin allowlist |
| `QR_TOKEN_SECRET` | optional | defaults to `JWT_ACCESS_SECRET` |
| `SMTP_*` / `RESEND_API_KEY` / `TWILIO_*` / `META_WA_*` / `FCM_*` | optional | a channel with no creds is skipped (in-app always works) |
| `SOCKET_REDIS_ADAPTER` | **`true` for multi-instance** | required for cross-instance Socket.IO broadcasts |
| `PLATFORM_ADMIN_*` | for seeding only | validated by the seeder when it runs |

A non-production boot uses friendly developer defaults for all of the above.

## Boot sequence (`src/server.js`)

1. Connect Mongo + Redis (fail-fast).
2. `registerModules()` — DI registration, RBAC seed, event-handler subscription,
   provider/job registration per module.
3. Build the HTTP app, `listen`.
4. Initialize Socket.IO (attaches the Redis adapter when `SOCKET_REDIS_ADAPTER=true`).
5. `jobManager.start()` — BullMQ workers (started AFTER modules register their jobs).

## Health & readiness

- `GET /health` — liveness (process up). Used by the Docker `HEALTHCHECK`.
- `GET /ready` — readiness; pings Mongo + Redis and returns **503** when a
  dependency is down. Wire this to the Kubernetes readiness probe (and the
  liveness probe to `/health`).
- `GET /metrics` — Prometheus (process + HTTP metrics). Scrape over a private
  network or gate at the ingress; it exposes no business data.

## Seeding

```bash
npm run seed              # idempotent: permission catalog, roles, platform admin,
                          # per-module net-new permissions + notification templates
npm run seed -- --rollback
```

Set `PLATFORM_ADMIN_NAME/_EMAIL/_PASSWORD` first. Safe to re-run. See
[docs/SEEDING.md](SEEDING.md).

## Graceful shutdown

On `SIGTERM`/`SIGINT` (and `unhandledRejection`/`uncaughtException`) the server
drains in order, bounded by `SHUTDOWN_TIMEOUT_MS` (default 10s, PM2 `kill_timeout`
should be larger — it is 12s):

```
stop HTTP (drain in-flight) → close Socket.IO (+ its Redis adapter clients)
                            → stop BullMQ workers + queues
                            → disconnect Redis + Mongo
```

## Horizontal scaling

- The app is stateless — scale HTTP instances behind a load balancer.
- **Set `SOCKET_REDIS_ADAPTER=true`** so realtime events emitted on one instance
  reach clients connected to any instance.
- BullMQ workers run in-process; scale queue throughput by adding instances (each
  runs the registered workers) — jobs are distributed via Redis. For heavy
  analytics rebuilds, consider a dedicated worker deployment.
- Redis is the coordination point (locks, rate limits, queues, cache, socket
  adapter) — run it HA (Sentinel/cluster) for production.

## Scale characteristics

- Dashboards read pre-aggregated **projections**, never the transaction history —
  O(range) indexed reads. Projection writes are atomic `$inc` upserts driven by
  events off the request path.
- Analytics **rebuild** runs on the `analytics:rebuild` BullMQ queue (never the
  request thread), streaming the order history in keyset batches with `bulkWrite`.
- Payment settle, loyalty ledger, and the notification outbox are idempotent
  (unique indexes) and safe under retries.

## Backup & restore

- **MongoDB**: scheduled `mongodump`/snapshots; the immutable ledgers
  (transactions, loyalty ledger, invoices) are the financial source of truth —
  back them up with point-in-time recovery. Restore = restore Mongo; analytics
  projections can then be **rebuilt** per restaurant (`POST
  /restaurant/analytics/rebuild`) or reconciled (`/reconcile`).
- **Redis** is a cache/coordination store — it can be lost and repopulated
  (projections/ledgers are authoritative in Mongo). Persist BullMQ queues if you
  need in-flight jobs to survive a Redis restart.

## Rollback

1. Roll the deployment back to the previous image/release (stateless app).
2. Schema changes are additive (Mongoose, no destructive migrations) — a rollback
   is safe. If a projection shape changed, run a rebuild after rollback.
3. If a bad projection state is suspected, run `/reconcile` (report-only) then
   `/rebuild` (recompute from authoritative orders).

## Monitoring hooks

- Structured pino logs (JSON) with correlation ids + secret/PII redaction.
- Prometheus `/metrics`.
- Domain events for ops alerting: `analytics.reconciliation_failed`,
  `notification.failed` (+ dead-letter queue), `kitchen.sla.breached`.
- Watch: BullMQ failed/dead-letter counts, `analytics:rebuild` durations, Redis
  memory, Mongo slow queries, readiness flaps.
