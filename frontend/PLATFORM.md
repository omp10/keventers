# Keventers Frontend Platform (Phase F2)

The **client infrastructure layer** every Keventers app (Customer PWA, Restaurant &
Admin dashboards, Kitchen Display) stands on. It is the frontend equivalent of the
backend Platform Layer: **pure reusable infrastructure — no business pages, menus,
orders, or dashboards.** Those apps are built _on top_ of this, and never
re-implement any of it.

Built directly on the **Phase F1 Design System** (theme engine, component library,
layouts, motion, assets). F2 reuses every F1 abstraction and adds no visual redesign.

```
Pages  →  hooks  →  services  →  API Platform  →  backend
                 ↘  platform providers (auth, socket, flags, …)
```

## Golden rules (enforced across the codebase)

| Rule | Where it lives |
|------|----------------|
| Components **never** call `fetch`/axios directly | `@/platform/api` — one `ApiClient` (`api`) |
| Every socket event goes **through** the Socket Platform | `@/platform/socket` — `useSocketEvent`, `useRealtimeQuery` |
| Navigation is **configuration-driven**, never hardcoded | `@/navigation/config.ts` |
| No component contains `if (featureEnabled)` branching | `@/platform/feature-flags` — `<FeatureGate>` |
| Pages never manage auth themselves | `@/platform/auth` — provider + route guards |
| Google Maps is never called from components | `@/platform/maps` — loader + `<MapView>` |
| Offline handling is centralized | `@/platform/offline` — mutation queue + replay |
| Permissions are one config-driven model | `@/platform/permissions` — `AccessRule` + `evaluateAccess` |
| Only `config/env.ts` reads `import.meta.env` | everything imports `env` |

## Composition root — one `<AppProviders>`

Every app mounts exactly one:

```tsx
<AppProviders brand={brand} flags={flags} commandNavApp="restaurant">
  <AppRoutes />
</AppProviders>
```

Provider order (outer → inner):

```
ErrorBoundary → Theme → Router → Query → FeatureFlags → Auth → Socket →
Offline → Maps → Analytics → Notifications → Tooltip → Command → Suspense
```

Global hosts (`GlobalLoadingBar`, `OverlayHost`, `Toaster`) mount once inside it.

Deliberate deviations from the spec's linear list, for correctness:
- **FeatureFlags is hoisted above Command/Notifications** — `usePermissions` (used by
  the palette and route guards) composes Auth **and** FeatureFlags.
- **Socket sits under Auth but stays order-independent** — `SocketClient` reads its
  token from the module-level token store via an injected provider and reauths on
  auth-status change, so it never imports Auth (no cycle).
- **Location is hook-only** — no context/provider is needed.

## The platforms

| Platform | Import | What it gives you |
|----------|--------|-------------------|
| API | `@/platform/api` | Single fetch-based `ApiClient`, envelope unwrap, 401 single-flight refresh, retries, offline queueing, upload/download |
| Auth | `@/platform/auth` | Session recovery, silent refresh, token store, `useAuth`, route guards (`RequireAuth/Role/Permission`, `GuestOnly`) |
| Permissions | `@/platform/permissions` | `AccessRule` model, wildcard matching, `usePermissions().can()`, `<Can>` |
| Feature Flags | `@/platform/feature-flags` | env-default flags + runtime overrides, `useFeatureFlag`, `<FeatureGate>` |
| Query | `@/platform/query` | `useQueryResource`, `usePaginatedResource`, `useInfiniteResource`, `useMutationResource`, `useOptimisticMutation`, `useRealtimeQuery` |
| Socket | `@/platform/socket` | `SocketClient` wrapper, rooms, reconnect/rejoin, `useSocketEvent`, `useRoom`, `useConnectionState` |
| Offline | `@/platform/offline` | Online detection, mutation queue (localStorage), replay-on-reconnect, `useOffline` |
| Notifications | `@/platform/notifications` | Single inbox store fed by socket + REST, `useNotifications`, `useUnreadCount`, `<NotificationCenter>` |
| Search | `@/platform/search` | Pluggable provider registry, `useGlobalSearch` (debounced, permission-filtered) |
| Command | `@/platform/command` | ⌘K palette composing commands + navigation + global search, `useRegisterCommand`, recents |
| Location | `@/platform/location` | Geolocation wrapper, permission query, haversine, `useLocation` |
| Maps | `@/platform/maps` | Google Maps loader (one key, one load), `useMaps`, `useGeocoder`, `<MapView>` |
| Scanner | `@/platform/scanner` | `BarcodeDetector` + camera + manual-entry fallback, `useScanner`, `<ScannerView>` |
| Discovery | `@/platform/discovery` | Generic nearby/trending/favorites/recent engine, filter/sort, list⇄map, `useDiscovery`, `useFavorites` |
| Analytics | `@/platform/analytics` | **Interface only** + no-op default; apps inject a real provider (`useAnalytics`) |
| Error | `@/platform/error` | `ErrorBoundary`, error/forbidden/offline pages |
| Loading | `@/platform/loading` | Global loading manager, `<GlobalLoadingBar>`, `useLoading` |
| Overlays | `@/platform/overlays` | Imperative `modals.open()` / `drawers.open()` + single `OverlayHost` |

## Application shell

`@/shell` — the platform composition management apps mount:

```tsx
<AppShell app="restaurant" quickActions={<NewOrderButton/>}>
  <RouteOutlet/>
</AppShell>
```

Layers global chrome (`EnvironmentBanner`, `ConnectionStatus`) over the F1 `AppShell`
layout, and wires the config-driven sidebar, `CommandTrigger`, `NotificationCenter`,
and `Breadcrumbs`. Navigation changes = editing `@/navigation/config.ts`, never a
component.

## Verification

No build tooling in this environment (`npm install`/`tsc`/`vite` unavailable). Verified
via an import-resolution scan that walks `src/`, resolving every `@/…` and relative
import (including `/index` barrels): **199 files, 513 local imports, 0 unresolved.**
