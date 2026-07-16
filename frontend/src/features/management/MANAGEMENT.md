# Restaurant Business Management (F4.3)

The management application is mounted under `/dashboard` and reuses the restaurant shell, API client, query platform, permissions, theme engine, global search, and command palette.

## Modules

- Staff and roles consume Identity, Organization, and backend RBAC contracts.
- Customers consume Customer Platform profiles, loyalty, rewards, preferences, and exports.
- Tables and QR consume QR Ordering. Occupancy and QR validity remain backend-owned.
- Coupons consume Pricing; the UI edits definitions and never computes discounts.
- Payments are read-only Payment Engine reports for history, refunds, failures, providers, exports, and settlements.
- Business settings cover restaurant profile, branches, delivery-zone GeoJSON, notification preferences, subscription, and security.

Delivery polygons and radius values are edited and previewed only. Serviceability decisions must always come from `deliveryZoneService.preview`.

All network access follows `components -> services -> API Platform`. Feature code must not call `fetch` directly or duplicate backend rules.
