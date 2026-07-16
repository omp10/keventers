# Keventers Brand Integration — Design Language & White-Label Guide

The Keventers identity is **one Brand preset** ([brand.ts](./brand.ts)). Every visual
decision below flows through the centralized Theme Engine (`Brand → resolver →
--kv-* CSS variables → Tailwind utilities`). No component contains a brand value.
Swapping `defaultBrand` (or calling `setBrand()`) rebrands the entire platform.

## 1. Brand extraction (from the official badge, EST. 1925)

| Element in the badge            | Extracted role     | Token                                  |
| ------------------------------- | ------------------ | -------------------------------------- |
| Milkshake pink + speed-lines    | **Primary**        | `raspberry` ramp (CTA `500 #D6246F`)   |
| Wordmark + bottom pill navy     | **Brand secondary**| `navy` ramp (`700 #303879` light)      |
| Golden upper field, "enjoy" dot | **Accent**         | `amber` ramp (dark-ink foreground)     |
| Ring teal, "repeat" dot         | **Info / live**    | `teal` ramp                            |
| Cream badge field               | **Neutral canvas** | `cream` ramp (paper → heritage navy)   |
| Red straw stripes               | **Danger**         | `rose` (system)                        |
| Circular badge, pill nav bar    | **Shape**          | `radius: 'soft'` (1.4× scale)          |
| "Scan • Order • Enjoy • Repeat" | **Tagline/motion** | `tagline`, `motion.signature: 'lively'`|

**Brand emotion:** premium, warm, appetizing, heritage-playful — never childish,
never a generic SaaS dashboard.

## 2. What the preset drives (no component edits)

- **Semantic colors** — resolver maps ramps onto roles per scheme
  ([theme-resolver.ts](./utils/theme-resolver.ts)): primary/hover/active, accent
  (+ contrast-safe `onAccent*` inks), `brandSecondary`, status overrides.
- **Warm canvas** — `colors.neutral` (cream) retints background, surfaces,
  borders and inks: warm paper in light mode, navy-black night canvas in dark.
- **Charts** — `chart1..chart6` roles are ALWAYS derived from resolved brand
  roles (primary, accent, secondary, info, success, warning). `chartColors.series`
  in ChartWrapper reads them; chart code never names a color.
- **Gradients** ([tokens/gradients.ts](./tokens/gradients.ts)) — experience-named,
  built ONLY from semantic vars: `hero`, `heroDeep`, `promo`, `loyalty`, `cta`,
  `chartFill`, `loading`, `qr`, `tracking`, `dashboard`, `kitchen`, `celebrate`.
- **Shadows** — `brand` (primary-tinted lift) and `glow` (halo) join the neutral
  elevation set; exposed as `shadow-brand` / `shadow-glow` utilities.
- **Motion** — new `lively` spring signature (460/27/0.85): playful-premium
  micro-overshoot; kitchen/admin surfaces inherit it only through the same
  tokens they already use. Reduced-motion gating unchanged.
- **Typography** — same families/architecture; display roles tuned to weight
  800 + tighter tracking for badge-like confidence.

## 3. Per-application usage (guidance, all token-driven)

- **Customer** — warm & appetizing: `hero`, `promo`, `loyalty`, `cta` gradients,
  `shadow-brand` on the floating cart, `qr`/`celebrate` for signature moments.
- **Restaurant ops** — professional: neutral surfaces + `dashboard` wash only;
  brand appears in charts, status accents, focus rings.
- **Kitchen (KDS)** — high contrast, minimal: `kitchen` gradient is near-invisible;
  everything else stays neutral/status-driven.
- **Admin** — enterprise-subtle: `heroDeep` for auth/login panel, otherwise neutral.

## 4. Accessibility (WCAG AA)

- Light: `raspberry 500` vs. white ≥ 4.5:1; accent gold uses dark ink
  (`onAccentLight #43290A`), never white-on-gold; `navy 700` vs. white ≫ 7:1;
  `teal 600` vs. white ≥ 4.5:1.
- Dark: 400-steps on the navy-black canvas with dark inks (`onPrimaryDark`,
  `onAccentDark`) — all pairs ≥ AA. Focus ring = primary at both schemes.

## 5. Rebranding to another company

Create a new `Brand` object (all new fields are optional — see `starbucks` /
`mcdonalds` proofs) and set it as `defaultBrand` or pass to `setBrand()`:

```ts
const acme: Brand = {
  id: 'acme', name: 'Acme', appName: 'Acme Eats',
  logo: { … },
  colors: { primary: acmeBlue, accent: acmeOrange /* secondary/neutral optional */ },
  radius: 'subtle', density: 'compact', motion: { signature: 'snappy' },
};
```

Everything — colors, canvas temperature, charts, gradients, shadows, radius,
motion, logo mark, empty states, loading — follows. **Never** put a brand value
in a component; add a token role here instead.
