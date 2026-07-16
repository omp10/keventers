# F7 Enterprise Integration and System Validation

Validated on 2026-07-16. This phase integrates existing modules only; it adds no business module or feature folder.

## Verified

- Frontend TypeScript and Vite production build complete successfully (`pnpm build`). Route-level pages are lazy-loaded.
- All backend non-integration Vitest suites pass. Focused cart and analytics regression suites pass (28 tests total).
- Customer cart endpoints now match the client for coupon application/removal, checkout locking, cart notes, and abandonment.
- Cash/pay-at-counter remains an order method; customer clients no longer call nonexistent payment status or cash-capture endpoints. Online payment creation and confirmation use the Payment Engine.
- Cart locking rejects subsequent mutations and prevents creation of a second active cart.
- Analytics dashboard aggregation and projection rebuild adapters produce consistent completed-order and average-order metrics.
- Socket listeners unsubscribe on cleanup. Order, restaurant, kitchen, payment, and notification freshness is event-driven.
- No React Query `refetchInterval` is present. Remaining intervals are the Socket.IO heartbeat and the kitchen elapsed-time display, not API polling.
- App-level error boundary, API error normalization, loading states, PWA manifest/service worker registration, offline queueing, route guards, command palette, semantic labels, and responsive breakpoints are wired through shared platform/design-system layers.

## Audit Notes

- Query keys are centralized through `qk`; mutations update or invalidate the relevant cache rather than maintaining parallel business state.
- Customer, restaurant, kitchen, and admin routes are code-split. Shared providers own auth, query, sockets, feature flags, notifications, loading, and errors.
- Payment amounts remain server-authoritative. Provider secrets and capture/reconciliation stay in the backend.
- Cart writes use optimistic versions and idempotency for adds. Offline replay is restricted to explicitly queueable mutations.
- Decorative icons are hidden from assistive technology; icon-only controls, navigation, dialogs, progress, search suggestions, filters, and kitchen controls expose roles or accessible labels.

## Residual Risks

- Database-backed integration suites require the ephemeral MongoDB test environment. In this workstation run, 14 integration files timed out during database hooks (46 tests skipped); this is an environment validation gap, not a passing result.
- The production build reports a 1.01 MB minified shared chunk (281 KB gzip). Route chunks are split, but shared dependency splitting should be profiled before F8 rather than changed without runtime performance data.
- Mongoose reports duplicate-index declarations in several existing schemas during tests. They do not fail tests, but should be consolidated before schema migration work.
- Automated compilation and static audits do not replace physical-device, screen-reader, provider-sandbox, push-delivery, geolocation, or ultra-wide/foldable acceptance testing.

## Reproduction

```powershell
cd frontend
pnpm build

cd ..\backend
npx vitest run --exclude "**/*.integration.test.js"
npx vitest run src/modules/cart/tests/cart.service.test.js src/modules/analytics/tests/dashboard-rebuild.test.js
```
