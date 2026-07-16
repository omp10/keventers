# Restaurant Operations Dashboard (Phase F4.1)

The first **staff-facing** application — a premium, realtime operations console built
entirely on F1 (Design System) + F2 (Frontend Platform), reusing the ordering domain
(F3.2). Namespaced under **`/dashboard`** so it coexists with the customer app in one
SPA. Auth-gated (RequireAuth → `/dashboard/login`).

## Built for every-minute operations

Dense, fast, realtime. Speed + clarity over decoration. Tablet-optimized (the shell
+ boards reflow to laptop/tablet). Everything premium-SaaS in feel (Linear/Stripe/
Square), not admin-template.

## Realtime — Socket.IO only, never polling

One engine, `useRestaurantRealtime()` (mounted once in the layout):
- joins the staff rooms from `useStaffContext()`,
- subscribes to `order:*` / `payment:*` / `kitchen:*` via the **Socket Platform**,
- on a new order: plays the **configurable chime**, raises a toast, prepends to the
  live activity feed, and **batches one invalidation** of all `staff` queries — so
  KPIs, graphs, board, and activity update in sync,
- order cards animate in on arrival.

No `refetchInterval`, no `setInterval` — verified. Freshness is event-driven.

## Modules

| Module | Notes |
|--------|-------|
| **Dashboard** | KPIs (revenue/orders/AOV/prep), orders breakdown, kitchen SLA, payments, revenue + hourly charts, top products, live activity |
| **Live Orders** | primary screen: filters + saved views + search + 4 board views (list/kanban/compact/table) |
| **Order Detail** | full-height drawer (URL-driven `?order=`): customer/session/table/QR/branch, items+variants+modifiers+add-ons+instructions, coupon, read-only pricing snapshot, payment, kitchen, merged timeline, actions |
| **Analytics** | overview cards + charts (revenue/orders/avg-ticket/completion/cancellation/customers/peak/best-sellers), range toggle |
| **Notifications** | reuses the Notification Platform inbox |
| **Command Palette** | ⌘K commands (navigate + search orders + create-order placeholder) via the Command Platform |
| **Search** | orders searchable through the Global Search Platform (registered provider) |
| Kitchen / Customers / Menu / Payments / Tables | navigation placeholders (later phases) |
| Settings | new-order sound (enabled/volume/test) |

## Reusable widgets (Admin-ready)

`widgets/` are **presentational** (pass backend data) so the Admin dashboard reuses
them unchanged: `KpiWidget`, `RevenueWidget`, `HourlyOrdersWidget`, `TopProductsWidget`,
`KitchenSlaWidget`, `OrdersBreakdownWidget`, `PaymentsWidget`, `ActivityFeedWidget`,
plus dependency-free theme-driven charts `MiniAreaChart` / `MiniBarChart` (colors via
`currentColor` → white-label + dark-mode aware).

## Order Board — one data source, many views

`OrderBoard` renders the **same** `OrderSummary[]` as list / kanban / compact / table.
Switching a view changes rendering only; actions, realtime, and grouping
(`groupByBucket`) are identical.

## Golden rules (verified by grep)

- Backend-only numbers: **no price math**, no client-computed rates (analytics
  authoritative); `PriceBreakdown` reused read-only.
- Components never call `@/platform/api` — only `services/*` (context/order/analytics).
- Realtime is Socket-driven; **no polling**.
- Zero hardcoded colors/branding — theme tokens only.
- Orders → Order Engine; notifications → Notification Platform; search → Search
  Platform; navigation → config-driven `navConfigs.restaurant`.

## Structure

```
features/restaurant/
  services/   context, order (list/get/transition), analytics
  hooks/      useStaffContext, useDashboardMetrics/Revenue/Hourly/TopProducts/AnalyticsOverview/ActivityFeed,
              useLiveOrders/useOrderDetail/useOrderActions, useOrderDrawer, useDashboardIntegrations, keys
  realtime/   sound (Web Audio, configurable), activity-store, useRestaurantRealtime
  widgets/    reusable KPI/chart/list/status widgets + MiniArea/MiniBar charts
  orders/     OrderCard, OrderBoard (+views), OrderFilters (+saved views), OrderDetailDrawer, StaffOrderTimeline
  pages/      Dashboard, LiveOrders, Analytics, Login, Placeholders (+Settings/Notifications)
  RestaurantLayout.tsx   reuses the F2 shell AppShell + mounts realtime + drawer
  routes.tsx             /dashboard routes (lazy)
```

## Future modules

Catalog, Coupons, Tables, QR, Payments, Staff, Inventory, Reservations, Delivery, CRM,
Reports, Subscription plug in as new nav config entries + feature folders reusing the
same widgets, order components, realtime engine, and shell — no redesign. The widgets +
order board + charts are Admin-dashboard-ready.
