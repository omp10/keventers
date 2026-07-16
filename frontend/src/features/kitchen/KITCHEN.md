# Kitchen Display System (Phase F5)

A dedicated, production-grade KDS optimized for **tablets, touch screens, and
kitchen TVs** — mounted at **`/kitchen`** with its **own immersive shell** (no
dashboard sidebar), auth-gated. Built on F1 (Design System) + F2 (Platform), reusing
the ordering payment-status + the F4.1 `KpiWidget` and staff context.

## Design priorities

Speed · readability from several meters · **≥44px touch targets** · zero
hover-dependent actions · high contrast · realtime. Not optimized for phones.

## Realtime — Socket.IO only, never polling

One engine, `useKitchenRealtime()` (mounted once in the shell): joins the staff/
kitchen rooms and consumes `kitchen:*` / `order:*` events, plays the configured audio
cue per event, and **batches a single invalidation** of the queue + metrics per
burst. There is **no `refetchInterval`** anywhere. The only `setInterval` is
`useTick` — a single shared 1-second *display* clock that drives every on-screen
timer (no network), so a board of dozens of cards has one timer, not dozens.

## Modules

| Module | Notes |
|--------|-------|
| **Kitchen Board** | primary screen: realtime kanban Pending → Assigned → Preparing → Ready → Served; columns scroll independently |
| **Kitchen Order Card** | large touch card: order #, table, items + variants/modifiers/notes, big prep timer, SLA, priority, allergens (future), customer notes, payment status (read-only) |
| **Kitchen Dashboard** | KPIs (active/waiting/preparing/ready/served/avg-prep/SLA), performance gauge, live "needs attention" list |
| **Station Management** | stations (status/capacity/load/routing), chef workload; set station status |
| **Chef Assignment** | assign/reassign station + chef, or Auto-assign (backend strategy), workload/queue shown |
| **Timeline** | received → assigned → preparing → ready → served (backend timestamps) |
| **Timers** | large live prep timer (display clock) + remaining SLA, colored by backend SLA state |
| **SLA Monitoring** | on-time / approaching / breached — high-contrast, backend-driven |
| **Recall & Re-fire** | recall / re-fire / cancel with a required reason (audit trail) |
| **Search & Filters** | order #, table, station, chef, priority, status — client-side over the live queue |
| **Audio Alerts** | Web-Audio cues per event (new / priority / SLA / ready), mute + volume, wired to the Socket + Notification platforms |
| **Full Screen Mode** | Fullscreen API + Screen Wake Lock (re-acquired on visibility), immersive layout, no navigation |

## Zero business logic

The backend Kitchen Engine owns **routing, timers, SLA decisions, assignment, and
the workflow state machine**. The frontend only renders backend state and POSTs an
action verb (`assign`/`start`/`ready`/`serve`/`recall`/`refire`/`cancel`/`priority`)
to the state machine. The display timer/elapsed is presentation; `sla.state` (the
decision) comes from the backend.

## Structure

```
features/kitchen/
  services/   kitchen.service (queue/stations/chefs/metrics/transitions)  — ONLY backend touch point
  hooks/      data (queue/entry/stations/chefs/metrics) + actions + view store + realtime engine
  audio/      Web-Audio alert manager (mute/volume, per-event cues)
  fullscreen/ useKitchenMode (Fullscreen API + Wake Lock)
  components/ useTick (shared clock), PrepTimer, SlaBadge, KitchenTimeline, KitchenOrderCard
  panels/     RecallRefireDialog, ChefAssignSheet, KitchenSearch, KitchenFilters
  board/      KitchenColumn + KitchenBoard (kanban)
  dashboard/  KitchenDashboard
  stations/   StationManagement
  KitchenShell.tsx  immersive topbar (SLA summary, search/filters, audio, fullscreen, connection, tabs)
  routes.tsx        /kitchen (board index) + /kitchen/dashboard + /kitchen/stations
```

## Navigation & routes

The dashboard sidebar "Kitchen" item (config-driven `navConfigs.restaurant`) now
points to `/kitchen`, opening the immersive KDS (leaving the dashboard shell — by
design). Routes are auth-gated (`RequireAuth`, `kitchen:read`).

## Reuse & white-label

Reuses the F2 Socket/Query/Auth platforms, the ordering payment-status presentation,
and the F4.1 `KpiWidget` + `useStaffContext`. Zero hardcoded colors/branding — all
theme tokens (verified), so it rebrands with the theme.

## Future-ready

Kitchen printers, multiple kitchens, expo screens, bump bars, voice commands, an AI
kitchen assistant, and deeper kitchen analytics plug into the existing service/hooks/
realtime/audio abstractions (add an event, an action, a panel) without redesign.
