# Customer Discovery Platform (Phase F3.1)

The first **business application** on the Keventers Frontend Platform. It owns
everything that happens **before ordering** — smart entry, QR scanning, restaurant
(branch) discovery, search, filters, maps, favorites, and branch detail. Menu, cart,
checkout, payment, orders, and loyalty are **Phase F3.2** and are intentionally not
here.

Built entirely on **F1 (Design System)** + **F2 (Frontend Platform)**. No platform
was redesigned; every abstraction is reused.

## One app, adaptive by capability

There is **no separate mobile/desktop app**. A single application reorders the same
building blocks based on **device capabilities** (via the Capability Platform), never
`window.innerWidth`/`userAgent`:

- scanner-capable phone → **Scan QR** leads
- desktop / mouse → **Discovery** leads (location + search + map)
- tablet → decided from capabilities

## Smart Entry Engine

Every customer flows through the **Entry Engine** (`entry/`). It's a pure, fully
configurable resolver + a hook:

```
resolveEntry(context, config) → decision
```

| Situation | Decision |
|-----------|----------|
| Active guest session | `resume-session` |
| QR URL opened directly (`/r/<slug>`) | `open-branch` |
| QR code (`?code=` / manual) | `resolve-qr` |
| Phone + camera | `scanner-first` |
| Desktop | `discovery-*` |
| GPS granted / cached | `discovery-nearby` |
| GPS denied | `discovery-search` |

Configurable for kiosks / white-label (`surfaceOverride`, `resumeSessions`, …).

## Branch-based architecture (matches the backend)

The ordering location is always a **Branch**, never a Restaurant. Discovery returns
branches; each carries its own `location`, `hours`, `distanceMeters`, `services`, and
`orderingStatus`. **The frontend never computes distance, availability, or
serviceability** — the backend is authoritative; we render.

## Structure

```
features/discovery/
  entry/           Smart Entry Engine (pure resolver + hook + session context)
  home/            Adaptive HomeScreen + rails
  pages/           Route components + shared DiscoveryBrowser
  components/      RestaurantCard (grid/list/carousel/map), collections, map, results, format
  filters/         Chip-based, extensible filter/sort bar
  search/          Autocomplete SearchBar
  scanner/         ScannerExperience (business QR states) + qr parsing
  location/        useDiscoveryOrigin + LocationPrompt + origin cache
  favorites/       Favorites + recents (branch snapshots over platform collections)
  restaurant-detail/  Branch detail sections
  hooks/           Branch queries + discovery controller + suggest
  services/        discovery.service + qr.service (ONLY backend integration point)
  types.ts         Branch domain types
  routes.tsx       Route + tab config (single source)
  DiscoveryLayout.tsx  Tabbed (F1 CustomerLayout) + minimal chrome
```

## Data flow (F2 architecture preserved)

`Pages → hooks → services → API Platform → backend`. Components never call `api`
directly. All discovery reads are public/guest (`skipAuth`). Endpoints live in
`services/discovery.service.ts` as a documented contract — re-point to the real
backend routes in one file.

## Routing (`routes.tsx` = single source)

| Path | Page |
|------|------|
| `/` | Entry Engine → adaptive home |
| `/discover` | Full browse (search + filters + list/map/split) |
| `/search` | Search-first browse |
| `/nearby` | Nearest branches |
| `/r/:branchSlug` | Branch detail (SEO slug, never a DB id) |
| `/qr` | Scanner (handles `?code=`) |
| `/qr/manual` | Manual code entry |
| `/favorites` | Saved + recently visited |

Both the router **and** the bottom-tab nav derive from `discoveryRoutes` — navigation
is configuration-driven.

## Reuse of platforms

- **Capability Platform** (`@/platform/capabilities`) — camera/touch/hover/gps/
  barcode/reduced-motion/network → form-factor + entry surface.
- **Location Platform** — GPS + permission; wrapped by `useDiscoveryOrigin` (cache +
  reverse geocode).
- **Maps Platform** — `MapView`/`useGeocoder`; components never touch `google.maps`.
- **Scanner Platform** — `useScanner` (camera + BarcodeDetector + torch + switch);
  `ScannerExperience` adds only business QR states.
- **Discovery Platform** — `collections` (favorites/recents id-sets).
- **Query Platform** — infinite/paginated/query resource hooks; prefetch on hover.
- **Design System** — every pixel from tokens → white-label ready; zero hardcoded
  colors/typography/assets.

## Future-ready

Delivery, Reservations, Promotions, Marketplace, Drive-through, sponsored/chain
locations all plug into the existing abstractions: add a `ServiceMode`, a filter
chip, a `PlaceSuggestion` kind, an entry rule, or a home rail — no redesign.
