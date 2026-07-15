# Restaurant Catalog Management (Phase 4.3)

The catalog is the foundation every future ordering operation depends on — QR
ordering, cart, orders, the Kitchen Display System, inventory, the customer app,
the restaurant dashboard, analytics, loyalty and future POS integrations.

It **reuses** the platform primitives (BaseRepository, BaseService, event bus,
cache, audit logger, storage, notifications, auth/RBAC, tenant context, API
response wrapper, validation, DI container) and **inherits** the organization
module's multi-tenancy rather than re-implementing any of it.

## Business hierarchy

```
Menu
 └── Category            (single self-referencing model; parentId = null → main)
      └── Subcategory    (parentId set; MAX DEPTH = 2, enforced by the service)
           └── Product
                ├── Variant            (own price / SKU / availability / prep time)
                ├── Modifier Group ──► Modifier
                └── Add-on             (reusable across products)
```

### Category design

A **single `Category` model** represents both main categories and subcategories
via `parentId` (`null` = main, set = subcategory). `depth` is denormalised
(0/1). The service layer is the sole enforcer of **maximum depth 2**: a
subcategory can never be used as a parent, and a category that already has
children cannot be demoted to a subcategory.

## Collections

| Model | Purpose | Key tenant-scoped indexes |
| --- | --- | --- |
| `Menu` | Multiple menus; scheduling, visibility, versioning, active/default | `(org, rest, slug)` unique; `(rest, status, displayOrder)` |
| `Category` | Main + subcategory (self-ref `parentId`) | `(org, rest, slug)` unique; `(rest, parentId, displayOrder)` |
| `Product` | Sellable item; images, pricing, dietary, availability, refs | `(org, rest, slug)` unique; `(rest, sku)` unique-partial; text index |
| `Variant` | Product variation, own price/SKU | `(rest, productId, displayOrder)`; `(rest, sku)` unique-partial |
| `ModifierGroup` | Reusable choice group (required, min/max) | `(rest, status, displayOrder)` |
| `Modifier` | Choice within a group (price/calories) | `(rest, groupId, displayOrder)` |
| `Addon` | Reusable priced extra | `(rest, status, displayOrder)` |
| `ProductAvailability` | Branch-specific availability override | `(branch, product, variant)` unique |

All collections have `timestamps`, **soft delete** (`deletedAt`) and compound
indexes designed for millions of products across thousands of restaurants.

## Multi-tenancy & security

- Every entity belongs to an **organization + restaurant** (branch-scoped
  entities add `branchId`). Clients never supply tenant identifiers.
- `resolveScope(tenant, restaurantId?)` (via the organization `RestaurantService`)
  resolves and access-checks the target restaurant; `CatalogScopedRepository`
  injects `{ organizationId, restaurantId }` into **every** query.
- By-id operations `loadOwned()` the entity then `assertCatalogAccess()` →
  **404** if missing, **403** on cross-tenant access. Another restaurant's
  catalog is never exposed.
- Every endpoint requires **authentication → tenant resolution → role
  authorization**. Restaurant management is limited to Organization Admins and
  Restaurant Managers (their assigned restaurants); `/admin/catalog` is
  Super-Admin **inspection only** and requires an explicit `?restaurantId=`.

## API surface

| Base path | Notes |
| --- | --- |
| `/api/v1/restaurant/menus` | CRUD + `:id/publish`, `:id/archive` |
| `/api/v1/restaurant/categories` | CRUD + `/tree` |
| `/api/v1/restaurant/products` | CRUD + `:id/detail`, `:id/images`, `:id/availability[/branch]`, `/:productId/variants` |
| `/api/v1/restaurant/variants` | `:id` GET/PATCH/DELETE |
| `/api/v1/restaurant/modifiers` | groups CRUD + `:id/modifiers[/:modifierId]` |
| `/api/v1/restaurant/addons` | CRUD + `:id/image` |
| `/api/v1/restaurant/catalog` | `/` full tree (cached), `/stats`, `/menus/:menuId`, `/import`, `/export` |
| `/api/v1/admin/catalog` | `/`, `/stats`, `/menus`, `/products[/:id]` (Super-Admin) |

Every listing endpoint supports **pagination, filtering, search and sorting**
(category, subcategory, price range, dietary, featured, popular, status, …).
All routes validate body/params/query with Zod before reaching a service.
Documented via Swagger JSDoc (`/docs`).

## Pricing & availability

- **PricingService** resolves the effective price from the layered model
  (base → variant → promotional → scheduled). It is the single seam future
  **dynamic pricing** (branch overrides, surge, loyalty, coupons) plugs into.
- **AvailabilityService** resolves "is this sellable now at branch X?" from the
  product default + branch `ProductAvailability` override + time windows
  (breakfast/lunch/dinner, weekdays/weekends, holiday overrides, out-of-stock,
  temporary disable).

## Events (event-driven boundaries)

Domain events are published on every change (`catalog.menu.published`,
`catalog.product.created|updated|deleted`, `catalog.product.availability_changed`,
`catalog.product.price_changed`, `catalog.variant.*`, `catalog.modifier.*`,
`catalog.addon.*`, …). The module's own handlers log key transitions and
**invalidate the public-catalog Redis cache**; future modules (KDS, inventory,
analytics) subscribe independently.

### Extension points (interfaces only this phase)

- **Inventory hooks** — products/variants carry `trackInventory` + `inventoryRef`;
  well-known events (`catalog.inventory.low|updated|unavailable`,
  `catalog.product.stock_changed`) and an `InventoryProvider` contract are
  declared for a future inventory module. No inventory logic is implemented.
- **Import / Export** — `CatalogImporter` / `CatalogExporter` contracts and a
  tenant-scoped `ImportExportService` surface (CSV/Excel/bulk upload) are wired;
  concrete parsing is added later. Endpoints reject with a clear "not
  implemented" error until an adapter is bound via DI.

## Caching

Only the **published, customer-facing** catalog is cached (Redis, 300s), keyed by
`public-catalog:<restaurantId>` and `public-menu:<restaurantId>:<menuId>`. Any
mutation event invalidates these keys. **Tenant-sensitive administrative data is
never cached** (e.g. `catalog/stats` is always live).

## Seeding

`003-catalog-core` (`src/modules/catalog/seeds/catalog.seeder.js`, registered in
`seed-registry.js`) adds the net-new permission rows (`variant:*`, `addon:*`,
`catalog:{read,import,export}`); `menu/category/product/modifier` CRUD already
exist in the identity core catalog. Idempotent, run via `npm run seed`.

## Testing

- **Unit** (no MongoDB/Redis): `category` (depth-2 enforcement), `menu`
  (publish/archive/versioning), `product` (root-category denormalisation, SKU
  conflicts, price events), `modifier` (selection-bound validation, cascade),
  `pricing`, `availability`, `catalog-tenant` (403/404 isolation),
  `scoped-repository` (tenant scoping).
- **Integration** (`docker compose up mongo redis`): routing/wiring, auth
  boundaries, clean coexistence with the organization module's routers, and
  Super-Admin catalog inspection.

## Module registration

Registered in `src/modules/index.js` **before** the organization module and
mounted at basePath `/` with **specific** sub-paths (`/restaurant/menus`,
`/restaurant/products`, … , `/admin/catalog`). Specific mounts win for catalog
paths while every other `/restaurant/*`, `/admin/*` and `/public` request falls
through to the organization module. DI tokens are registered under
`CATALOG_TOKENS`; the public barrel is `src/modules/catalog/index.js`.
