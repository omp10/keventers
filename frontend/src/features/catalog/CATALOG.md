# Restaurant Catalog Management (Phase F4.2)

The catalog manager restaurant managers use to control everything customers see in
the ordering experience. Built **into the existing F4.1 dashboard** (no new shell —
the AppShell sidebar/topbar/command palette/notifications are reused), namespaced
under `/dashboard`. Everything consumes the backend **Catalog module**; the frontend
implements **no business rules** (pricing math, availability resolution, and the
publish state machine are all backend-owned).

Feel: Shopify / Square / Toast / Lightspeed — speed, bulk operations, and scale over
traditional CRUD forms.

## Modules

| Module | Notes |
|--------|-------|
| **Menus** | multiple menus, active menu, schedule, duplicate, archive, publish |
| **Categories** | nested tree, drag-drop reorder, visibility, availability, images/icons, tree⇄list, search, bulk |
| **Products** | grid/table, search, filters, saved views, bulk ops, duplicate, archive, publish, infinite scroll |
| **Product Editor** | premium full-screen drawer, sectioned: General / Media / Pricing / Variants / Modifiers / Add-ons / Availability / SEO / Scheduling / Preview / Audit |
| **Variants** | cross-catalog list + bulk editing; in-editor per-product management + reorder |
| **Modifier groups** | required/optional, min/max selection rules, options + reorder, bulk, preview |
| **Add-ons** | pricing, availability, grouping, bulk |
| **Availability** | available / unavailable / scheduled + branch overrides (backend-resolved) |
| **Live Preview** | device-framed (desktop/tablet/mobile) customer menu — **reuses the F3.2 ordering `MenuBoard`/`ProductCard`** so it matches the real menu; reflects cache edits immediately |

## Golden rules (verified)

- **Never call `@/platform/api`** — components → hooks → `services/*` → API Platform.
- **No business rules / no price math** — `formatMoney` for display, `PriceInput`
  only converts a typed value into a Money DTO for saving; the backend owns pricing.
- **Availability reflects backend state only** (`available`/`unavailable`/`scheduled`).
- **Media through the backend pipeline** — `mediaService.upload` uses the API
  Platform's XHR upload (Cloudinary via the Storage Platform); no client keys.
- **Search through the Search Platform** — a registered products provider.
- **Zero hardcoded colors/branding** — theme tokens only (white-label).

## Reusable building blocks

- **Bulk**: `useBulkSelection` + `BulkActionBar` — one selection model + action bar
  reused by products, categories, variants, modifiers, add-ons. New actions = array
  entries.
- **Filters + saved views**: `CatalogFilters` (chip-based, reuses Discovery's
  `FilterChip`) + a generic scoped `useSavedViews`.
- **Media**: `MediaManager` (upload, gallery, drag-reorder, cover) + `useUpload`.
- **DnD**: `SortableList` — native HTML5 drag-and-drop + keyboard move up/down
  (WCAG), reused by the category tree, variants, add-ons, and media.
- **Primitives**: `StatusBadge`, `AvailabilityBadge`, `VegSelect`, `PriceInput`,
  `ScheduleField`, `AvailabilityControl`.

These + the editors are reusable by the future Admin dashboard.

## Structure

```
features/catalog/
  services/   product, menu, category, modifier(+addon+variant), media  (ONLY backend touch point)
  hooks/      data (menus/tree/products-infinite/product/modifiers/addons/variants) + mutations + command/search integration
  bulk/       useBulkSelection + BulkActionBar
  filters/    CatalogFilters + saved-views
  media/      MediaManager + useUpload
  components/ SortableList, StatusBadge, VegSelect, PriceInput, ScheduleField, AvailabilityControl
  products/   ProductsPage + ProductEditor (sectioned)
  menus/      MenusPage
  categories/ CategoriesPage + CategoryTree + CategoryEditor
  modifiers/  ModifiersPage + ModifierGroupEditor
  addons/     AddonsPage + AddonEditor
  variants/   VariantsPage
  preview/    PreviewPage + MenuPreview (device frames, catalog→ordering mappers)
  CatalogLayout.tsx   nested under RestaurantLayout; registers command/search
  routes.tsx          /dashboard/menu + /dashboard/catalog/* (lazy)
```

## Navigation & routes

Config-driven via `navConfigs.restaurant` (a "Catalog" group: Menus, Categories,
Products, Variants, Modifier groups, Add-ons, Live preview). Routes are nested under
the F4.1 `RestaurantLayout` (same shell + `RequireAuth`), so the command palette,
notifications, breadcrumbs, and connection status carry over. Command palette
registers New Product/Category, Search Products/Categories, Publish Menu (permission-
aware).

## Draft / Publish

`CatalogStatus` = draft | published | scheduled | archived — displayed via
`StatusBadge`; transitions are backend actions (`publish`, `archive`, `schedule`,
`activate`). The UI reflects state; it never computes it.

## Future-ready

Inventory, recipes, nutrition, supplier catalog, multi-language, multi-currency,
AI product generation, seasonal menus, and marketplace sync plug into the existing
services/hooks/primitives (add a field, a filter chip, a bulk action, or an editor
section) without redesign.
