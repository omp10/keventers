# Keventers Design System & Frontend Platform

The reusable **frontend foundation** for every Keventers app — Customer QR
Ordering PWA, Restaurant Dashboard, Admin Dashboard, Kitchen Display, and future
mobile apps. Not a set of pages: a **theme engine + design system + component
library + layout system + animation system** that every future screen inherits,
so the whole ecosystem feels like one premium product and can be **rebranded from
a single file**.

> Phase F1 deliverable — the foundation only. No business pages.

## Stack

React 19 · TypeScript · Vite 6 · Tailwind CSS v4 · Radix UI + shadcn patterns
(heavily customized) · Framer Motion · TanStack Query · Zustand · React Router ·
React Hook Form + Zod · Lucide. Modern function components + hooks only.

## The core idea: everything resolves from tokens

Nothing hardcodes a color, size, radius, shadow, z-index or motion value. Three
layers:

```
PRIMITIVE tokens (raw palettes)                theme/tokens/palette.ts
        ↓  resolved per brand + scheme
SEMANTIC tokens (roles: primary, surface…)     theme/tokens/colors.ts …
        ↓  emitted as CSS variables (--kv-*)
Tailwind utilities (bg-primary, rounded-lg…)   styles/globals.css  @theme inline
        ↓
Components  (buttonVariants, cardVariants…)     design-system/components/*
```

A component writes `bg-primary rounded-lg shadow-md`. Those compile to
`var(--kv-color-primary)`, `var(--kv-radius-lg)`, `var(--kv-shadow-md)` — whose
**values** are injected at runtime by the theme engine. Swap the brand or scheme
→ the variables change → the whole UI updates with **zero recompilation** and no
component edits.

## Rebranding (the definition of success)

Change the active brand and logo, colors, typography, radius, density and motion
update **everywhere**, no component touched:

```ts
// src/theme/brand.ts
export const defaultBrand = keventers; // → starbucks → mcdonalds → your brand
```

or at runtime / per tenant (white-label):

```tsx
const { setBrand } = useTheme();
setBrand(starbucks);
```

A `Brand` is a small declarative identity (name, logo, primary/accent ramps,
`radius` shape language, `density`, `motion` signature). The **resolver**
(`theme/utils/theme-resolver.ts`) derives the full themed variable set for light
+ dark; the **generator** injects it as one managed `<style>` tag. Three proof
brands ship: **Keventers**, **Starbucks**, **McDonald's** — try the switcher in
the showcase.

## Theming & dark mode

- Light / Dark / **System**, class-driven (`.dark`), switched instantly (class
  flip — no re-render of styles) and persisted (`localStorage`).
- Anti-FOUC: the scheme is resolved in an inline `<head>` script and the brand
  variables are injected synchronously before first paint.
- `useTheme()` → `{ brand, setBrand, mode, setMode, scheme, toggle, reducedMotion }`.

## What's inside

```
src/
  theme/          # THE engine — tokens/, brand.ts, providers/, hooks/, utils/
  design-system/  # components/ (~40) + icons/ (registry) + barrel
  animations/     # transitions, variants, motion primitives (reduced-motion aware)
  layouts/        # AppShell + Sidebar/Topbar → 6 shells
  assets/         # theme-aware Logo/Mark + illustrations (inline SVG, no files)
  providers/      # AppProviders (Theme → Query → Tooltip → Toaster)
  hooks/ lib/ utils/ store/ router/ services/ constants/ types/
  app/            # Showcase (the DS gallery / playground)
  styles/globals.css
```

### Design tokens (`src/theme/tokens`)
`palette` · `colors` (semantic roles, light+dark) · `typography` (families,
role scale, weights, tracking) · `spacing` (+ density presets) · `radius` (+ brand
shape scale) · `shadows`/`elevation` · `motion` (durations, easings, springs,
interaction) · `animations` (keyframes) · `layout` · `breakpoints` · `zIndex` ·
`opacity` · `blur` · `gradients`.

### Component library (`src/design-system/components`)
Buttons, Inputs, Textarea, OTP, Checkbox, Radio, Switch, Select, Combobox,
Search, Field · Badge/Chip/Tag, Avatar (+Group), Card, StatCard/MetricCard,
Table, Pagination, Breadcrumb, Timeline, QRCode, ChartWrapper · Spinner,
Skeleton, Progress/CircularProgress, LoadingOverlay, Empty/Error/Offline states,
Toast · Dialog/Modal, Drawer, Popover, Dropdown, Tooltip, Command Palette · Tabs,
Accordion, Separator, Typography (Heading/Text), ThemeToggle.

Every component: **variants × sizes × states** (loading/disabled/error), dark
mode, full **keyboard + screen-reader a11y** (Radix under the hood where it
matters), motion from the shared system, RTL-ready (logical utilities), and a
`className` escape hatch (merged via `cn`).

### Layout system (`src/layouts`)
Six shells on ONE shared `AppShell` (Sidebar + frosted Topbar): **Restaurant**,
**Admin** (dashboard shell), **Customer** (mobile-first PWA + bottom nav),
**Kitchen** (full-screen, forced-dark KDS), **Auth** (split brand panel),
**Minimal**. Mobile-first, responsive to ultra-wide.

### Animation system (`src/animations`)
Centralized transitions + variants (page, stagger, scale, slide, drawer, overlay,
hover/tap, success) and drop-in primitives (`FadeIn`, `ScaleIn`, `Stagger`,
`PageTransition`). All honor `prefers-reduced-motion` automatically.

### Icons (`src/design-system/icons`)
A semantic **registry** — components use `<Icon name="cart" />`, never import
Lucide directly, so the icon set is swappable and tree-shakes.

## Usage

```bash
pnpm install      # or npm install
pnpm dev          # Vite dev server (shows the DS showcase)
pnpm build        # tsc -b && vite build
pnpm typecheck
```

```tsx
import { Button, Card, Field, Input, Icon, useTheme } from '@/design-system';
import { AppProviders } from '@/providers/AppProviders';
import { RestaurantLayout } from '@/layouts';
```

Wrap your app once in `<AppProviders>` (optionally pass a tenant `brand`), then
compose screens from the components + a layout. Data fetching uses the shared
TanStack Query client; UI-only cross-cutting state uses the Zustand `ui` store.

## Accessibility

WCAG AA target: visible focus rings, keyboard nav + focus traps (Radix),
labelled controls (`Field`), `aria-*` wiring, reduced-motion + high-contrast
friendliness, ≥44px touch targets, and screen-reader status on async components.

## Performance

Route-level code splitting (`router/lazyRoute`), vendor chunk splitting, Tailwind
JIT + tree-shaking, `.lean` inline-SVG assets (no image requests), CSS-variable
theming (no JS style recompute on theme switch), and virtualization-ready table
styles.

## Extending

- **New brand** → add a `Brand` preset in `theme/brand.ts`.
- **New token** → add it to `theme/tokens/*` and map it in `globals.css`.
- **New component** → follow the CVA + `cn` + token pattern; export from the
  components barrel.
- **New icon** → add to the registry.

The goal: every future Customer PWA, Restaurant/Admin Dashboard and Kitchen
Display inherits this premium quality automatically.
