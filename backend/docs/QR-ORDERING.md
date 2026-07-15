# QR Ordering Gateway (Phase 4.4)

The entry point for every customer who scans a QR code. Its responsibility ENDS
after a valid guest ordering **session** exists — it never creates carts or
orders. It reuses the platform primitives (BaseRepository, BaseService, event
bus, Redis, cache, storage, notifications, auth/RBAC, tenant context, API
response wrapper, audit logger, validation, DI) and inherits the organization
module's multi-tenancy.

## The Session is the primary ordering identity

Cart, Order, Kitchen and Payment reference the **`sessionId`**, not a customer
id. This deliberately supports, with no future redesign:

- anonymous QR ordering (a guest never needs an account);
- logged-in customers (a session can be linked to an account mid-journey via
  `linkAccount`, **without losing history**);
- session recovery after a page refresh / device swap;
- multiple guests at one table (multiple live sessions per table);
- future split-bill / collaborative ordering.

## Entities (branch-scoped: organization + restaurant + branch)

| Model | Purpose | Key indexes |
| --- | --- | --- |
| `TableGroup` | Floor / zone / section | `(org, rest, branch, name)` unique |
| `Table` | Physical table (capacity, status, reservation flag, QR pointer) | `(org, rest, branch, number)` unique; `(branch, status)` |
| `QrCode` | Secure QR credential bound to a table | `token` unique; `(tableId, status)`; `expiresAt` |
| `GuestSession` | Durable session history (Redis holds the live copy) | `sessionId` unique; `(branch, status, createdAt)`; `recoveryCode` |

Sessions are historical records (no soft delete — they reach terminal states).

## Session state machine

```
CREATED → ACTIVE → IDLE → CHECKOUT_PENDING → COMPLETED
                                   ↘ EXPIRED
                                   ↘ TERMINATED
```

Transitions are guarded (`SESSION_TRANSITIONS`); terminal states destroy the
Redis snapshot and release the table. Each transition publishes a domain event.

## QR security model

The scannable code is **`<token>.<version>.<signature>`**:

- `token` — 192-bit unguessable random string (the DB lookup key);
- `version` — the QR's `secretVersion`;
- `signature` — `HMAC-SHA256(serverSecret, "<token>.<version>")`.

The signature is verified **offline** (server secret only) on every scan, so
tampering/forgery is rejected before any I/O and millions of scans never read a
secret. A Redis-cached, **non-sensitive** validation record (ids/status/expiry)
skips the entity read. Protections:

- **Tamper** → signature verification (constant-time).
- **Replay of a rotated code** → the cached/stored `secretVersion` must equal the
  code's version; rotating (`rotateSecret`) bumps it and invalidates old prints.
- **Invalid / unknown** → token lookup miss → 404.
- **Expired** → `expiresAt` check (temporary QRs).
- **Cross-tenant** → the QR carries its own tenant ids; management is always via a
  table/QR the caller owns (`loadOwned` → 403).
- **Deactivated** → status check; disable/rotate/regenerate invalidate the cache.

Regenerate mints a new token (old codes stop resolving); rotate keeps the token
but changes the signature version. QR **images** render via a pluggable
`QrRenderer` (default: lazy `qrcode`) and are stored through the Storage Platform
— never generated in a controller, best-effort (the QR works from its URL alone).

## Scan flow (`POST /public/qr/scan`)

```
parse code → verify signature → resolve QR (cache→Mongo) → QR active + version + not expired
  → restaurant ACTIVE → branch ACTIVE → business hours open → table available
  → create guest session (occupy table, emit events) → issue guest JWT
  → load restaurant context → return
```

The response contains the session, a **guest JWT** and the full **context**
(restaurant, branch, table, active menu, currency, tax, business hours,
branding) so the frontend needs no additional bootstrap requests. The endpoint
is rate-limited per IP (fixed window, Redis).

### Guest JWT

Signed with the platform JWT infrastructure but stamped `type: 'guest'`, so it is
rejected by the normal access-token verification and can never authenticate a
staff/admin route. Claims carry `sessionId`, `guestId`, and the org/restaurant/
branch/table ids. Verified by this module's `resolveGuest` / `requireGuest`
middleware (exported for Cart/Order to reuse).

## Redis usage

| Key | Purpose | TTL |
| --- | --- | --- |
| `qr:session:<sessionId>` | live session snapshot | idle timeout (sliding) |
| `qr:table-sessions:<tableId>` | set of live session ids (occupancy) | occupancy TTL |
| `qr:table-occupancy:<tableId>` | occupancy status snapshot | occupancy TTL |
| `qr:qr-validation:<token>` | non-sensitive QR validation record | 300s |
| `ratelimit:ip:<ip>:qr-scan` | scan rate limit | window |

No sensitive tenant data is cached (signing secrets are never in Redis).

## Table occupancy & auto-release

Occupancy lives in Redis (O(1)); the `Table` document is a best-effort mirror
updated on 0↔1 transitions under a short distributed lock. A table auto-releases
on: **order completion** (the Order module emits `order.completed{sessionId}`,
handled here → session completed → table freed), **session timeout** (the
`expireStaleSessions` sweep, for a scheduled job), and **manual admin action**
(`release-table` / force release).

## Events

`qr.generated|regenerated|secret_rotated|enabled|disabled|scanned`,
`session.created|recovered|activated|idle|checkout_pending|completed|expired|ended|linked_account`,
`table.occupied|released|status_changed`.

## Config (env)

`QR_TOKEN_SECRET` (defaults to `JWT_ACCESS_SECRET`), `QR_PUBLIC_BASE_URL`,
`GUEST_SESSION_TTL_SECONDS`, `GUEST_SESSION_IDLE_TIMEOUT_SECONDS`,
`GUEST_TOKEN_EXPIRES_IN`, `QR_SCAN_RATE_LIMIT`, `QR_SCAN_RATE_WINDOW_SECONDS`.

## Seeding

`004-qr-ordering-core` adds the net-new permissions (`table:manage`,
`qr:regenerate`, `session:read`, `session:manage`); `table:*`/`qr:*` CRUD already
exist in the identity core catalog.

## Testing

- **Unit** (no MongoDB/Redis): `qr-token.util` (sign/verify/tamper/rotate),
  `business-hours.util`, `session.service` (state machine, create/end/recover/
  link), `scan.service` (full flow + rejection paths), `qr.service`
  (generate/regenerate/rotate/disable, cache invalidation, secret never leaks),
  `tenant` (403/404 isolation), `scoped-repository` (branch scoping).
- **Integration** (`docker compose up mongo redis`): routing/wiring, auth
  boundaries, coexistence with the organization routers, public-scan validation,
  super-admin inspection.

## Module registration

Registered in `src/modules/index.js` **before** organization, mounted at basePath
`/` with **specific** sub-paths (`/public/qr`, `/public/session`,
`/restaurant/tables|table-groups|qr|sessions`, `/admin/tables|qr|sessions`) so
catalog/QR paths win and everything else falls through to organization. DI tokens
under `QR_TOKENS`; public barrel `src/modules/qr-ordering/index.js`. Additive,
non-breaking read helpers were added to the organization
(`restaurantService.getPublicProfile`, `branchService.getPublicById`) and catalog
(`catalogService.getPublicActiveMenu`) modules for the trusted scan flow.
