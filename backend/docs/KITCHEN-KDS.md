# Kitchen Display System — KDS (Phase 4.7)

A real-time **operational** system (not CRUD). It CONSUMES Order events and
orchestrates the kitchen workflow — queue, stations, chef assignment,
preparation workflow, timers, SLA monitoring and live Socket.IO updates. It
never redesigns or writes back to the Order module: **kitchen consumes order
events; it communicates outward only through kitchen events + sockets.**

## Event-driven boundary

```
order.confirmed  ──►  enqueue kitchen entry  (idempotent by orderId)
kitchen.queue.requested (seam) ──►  (same handler)
order.cancelled  ──►  cancel kitchen entry
```

The KDS reads the order once via a trusted `orderService.getByIdSystem(orderId)`
(an additive, internal-only getter) to snapshot its items — it never calls the
order service to change order state. Both `order.confirmed` and the purpose-built
`kitchen.queue.requested` fire the enqueue; the unique `orderId` index makes that
idempotent.

## Entities (branch-scoped)

| Model | Purpose |
| --- | --- |
| `KitchenQueueEntry` | One per confirmed order — snapshot items, station routing, workflow status, chef assignment, timers, SLA, timeline. Unique `orderId`. |
| `KitchenStation` | Grill/Fryer/Beverage/Dessert/Packaging/… with configurable routing rules (productIds → categoryIds → default). |
| `KitchenSlaTarget` | Configurable prep target (seconds), resolved product → category → branch default. |

Compound indexes for the hot board (`branch, status, priorityWeight desc,
queuedAt`), the station board (`branch, stationIds, status`), SLA reporting and
chef load.

## Workflow state machine

```
PENDING → ASSIGNED → PREPARING → READY → SERVED
PREPARING → RECALLED → PREPARING          (pulled back, re-prepared)
READY → REFIRED → PREPARING               (needs redo)
(any active) → CANCELLED                  (from order cancellation)
```

Illegal transitions throw. Every transition is **serialized per entry** (Redis
lock) + **optimistically versioned** (`transitionWithVersion` → 409), appends an
immutable timeline entry, and fans out: kitchen domain event → Socket.IO → audit.

## Stations & routing

Each order item is routed to station(s) by the `StationRouterService`
(configurable, future-proof: product id → category id → branch default). The
entry stores the union of stations it touches; the station board queries by
`stationIds`.

## Chef assignment

Manual assignment + reassignment are fully implemented (assignment records
current chef, assignedBy, assignedAt). **Auto**-assignment is a pluggable
`AutoAssignmentStrategy` (default round-robin, a safe no-op until a chef-roster
source is wired) — kept behind a seam so no chef-roster module is invented here.

## Timers & SLA

Timestamps are stored for every transition (`queuedAt, assignedAt, preparingAt,
readyAt, servedAt`); durations (queue/prep/ready/total kitchen time) are
**recomputed** from them so a display never drifts. The `SlaService` resolves the
entry's target (slowest item wins), flags a breach when prep time exceeds target
— at the `READY` transition (retrospective) and via a `sweepBreaches()` job for
still-preparing entries — and emits `kitchen.sla.breached`. It **never notifies
users directly** (Notifications/Analytics subscribe).

## Redis

`kds:branch-queue:<branchId>` (priority ZSET — rush first, then FIFO),
`kds:station-queue:<stationId>` (membership SET), `kds:prep-timer:<entryId>`
(SLA). MongoDB remains the authoritative board; Redis accelerates the live view,
station filters and SLA — best-effort (Mongo can rebuild). Per-entry mutation
lock (`kds:entry-mutation:<id>`).

## Socket.IO

Broadcasts `kitchen:queue_updated`, `kitchen:order_assigned|preparing|ready|
served|recalled` to the **restaurant**, **branch** and **station** rooms — never
to unrelated tenants (the room ids are the tenant/station ids). Best-effort: if
sockets aren't initialized it no-ops and never blocks a transition. High-frequency
friendly (thin payloads, room-scoped).

## Events

Consumes: `order.confirmed`, `kitchen.queue.requested`, `order.cancelled`.
Publishes: `kitchen.order.queued|assigned|preparing|ready|served|recalled|refired|
cancelled` and `kitchen.sla.breached`. Future Payments/Notifications/Analytics/
Loyalty modules subscribe to these — the KDS is never called directly.

## Multi-tenancy & security

Every entry/station/target belongs to organization + restaurant + branch. Scope
is resolved from the tenant context (never client ids); repositories scope every
query (with the tenant fields whitelisted so `buildFilter` can't strip them).
Cross-tenant access → 403. Controllers never move status directly (the state
machine + service own it). Enqueue is idempotent; transitions are versioned.

## APIs

`GET /restaurant/kitchen/queue` · `/restaurant/kitchen/stations` CRUD ·
`/restaurant/kitchen/sla` targets · `GET /restaurant/kitchen/orders/:id` ·
`PATCH /restaurant/kitchen/orders/:id/{assign,preparing,ready,served,recall,
refire,priority}` · `GET /admin/kitchen[/orders/:id]`. The `:id` is the ORDER id
(the kitchen entry is 1:1 with the order). All Swagger-documented.

## Module registration

Registered in `src/modules/index.js` before organization; mounts
`/restaurant/kitchen` + `/admin/kitchen`. DI tokens `KITCHEN_TOKENS`; public
barrel `#modules/kitchen`. Seeder `007-kitchen-core` adds `kitchen:*` + `station:*`.
Additive, non-breaking order change: `orderService.getByIdSystem(id)` (trusted
internal read for the KDS event handler).

## Testing

- **State machine**: legal/illegal transitions, recall/refire, terminal/active.
- **Station routing** + **timers** (pure).
- **Service**: enqueue-from-order (routing + SLA + idempotency), the full
  workflow, illegal transition (400), **version conflict (409)**, cross-tenant
  (403), cancel-from-order.
- **SLA**: target resolution (most-specific-first, slowest item), breach
  detection + sweep event.
- **Socket.IO**: no-op when uninitialized; broadcasts to restaurant/branch/station
  rooms only.
- **Integration** (`docker compose up mongo redis`): routing/wiring, staff +
  admin auth boundaries, module coexistence.
