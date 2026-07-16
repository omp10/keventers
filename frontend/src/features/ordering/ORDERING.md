# Customer Ordering Platform (Phase F3.2)

The full ordering experience — from entering a branch to a completed, tracked order —
built entirely on **F1 (Design System)**, **F2 (Frontend Platform)**, and **F3.1
(Discovery)**. No platform was redesigned.

```
Branch → Menu → Product (variants/modifiers/add-ons) → Cart → Coupon → Pricing
      → Checkout → PhonePe/Razorpay → Order Success → Live Tracking → Complete
```

## Golden rules (enforced)

| Rule | How |
|------|-----|
| Frontend never computes prices | `Money` DTOs are rendered as-is; `PriceBreakdown` is strictly read-only; verified no arithmetic on `amount` in components |
| Cart is server-authoritative | every mutation returns the full cart (items + Pricing-Engine breakdown + version) → written straight to cache |
| Never call APIs directly | components → hooks → `services/*` → API Platform (verified: no `@/platform/api` import outside `services/`) |
| Realtime, no polling | `useOrder` binds the order to the Socket Platform (`useRealtimeQuery`) — order/kitchen/payment events keep it live |
| Backend owns loyalty/points | frontend only displays + shows the backend redemption preview |
| White-label | zero hardcoded colors/assets/branding (verified) — all theme tokens + brand Logo |

## Layers

```
services/   session, menu, cart, order, payment, loyalty, profile  (the ONLY backend touch point)
hooks/      useSession, useMenu/useProduct, useCart, useCheckout, usePayment, useOrder(+realtime), useLoyalty, useProfile
components/  VegMark, PriceTag, QuantityStepper, ProductCard (grid/list/carousel), ProductDetail drawer
menu/        MenuHero, MenuBoard (sticky nav + scroll-spy), ProductRail, MenuSearch
cart/        FloatingCart, CartItemRow, CouponInput, PriceBreakdown (read-only), CartView
checkout/    CheckoutView (guest/customer, provider select, terms)
payment/     provider-launch (Razorpay widget / PhonePe redirect), PaymentPanel (state machine)
order/       OrderStatusTimeline (live), OrderSuccess
account/     LoyaltyPanel, OrderHistory, ProfilePanel, NotificationsList
pages/       MenuScreen, CartPage, CheckoutPage, OrderPage, Account/Orders/Loyalty/Notifications
routes.tsx   ordering routes (lazy) + OrderingLayout
```

## Session (guest ordering identity)

Ordering needs a backend session (the primary ordering identity). `sessionService.open(branchSlug)`
stores the returned guest token in the **Auth Platform** token store, so the **API
Platform** authenticates every subsequent cart/order call automatically. Adding the
first item auto-opens a session.

## Cart semantics (from the backend)

- **Idempotency-Key** on adds (no double-add on retry)
- **If-Match version** on mutations (optimistic concurrency → 409)
- mutations are **offline-queueable** — the F2 Offline Platform queues + replays them
  on reconnect; `FloatingCart`/`ConnectionStatus` surface offline state

## Payments (provider-agnostic)

`paymentService.createIntent` → the backend Payment Engine returns a handshake.
`provider-launch` hands it to the provider (Razorpay widget when present, PhonePe
hosted redirect via a backend URL). Verification + capture are backend + webhook
concerns; `OrderPage` reflects the final status in realtime and hides the payment
panel once captured. `PaymentPanel` covers pending/processing/failed/cancelled/retry.

## Live tracking

`OrderPage` (`/order/:id`) is the live hub: confirmation → payment (if pending) →
`OrderStatusTimeline`. It updates itself from Socket events — no polling, no refresh.

## Routes

`/r/:branchSlug/menu` · `/cart` · `/checkout` · `/order/:orderId` · `/orders` ·
`/account` · `/loyalty` · `/notifications`. Merged into the app router under
`OrderingLayout`; the Discovery "Order now" CTA opens `/r/:slug/menu`.

## PWA (`src/pwa/`, `public/`)

- `manifest.webmanifest` (installable, standalone), `sw.js` (app-shell network-first
  navigation, stale-while-revalidate assets, **API/mutations never cached** — the
  Offline Platform owns write replay; push-notification ready).
- `registerServiceWorker()` (production only), `useInstallPrompt` + `<InstallPrompt>`
  (dismissible A2HS banner). Brands replace `public/brand/favicon.svg` + manifest
  name/colors.

## Backend contract

All endpoints are centralized in `services/*` as a documented contract
(`/public/branches/:slug/menu`, `/cart/*`, `/orders`, `/payments/*`, `/customer/*`).
Re-pointing to the real backend routes is a per-file change; no component edits.

## Future-ready

Delivery, reservations, scheduled orders, table transfer, split bills, group ordering,
gift cards, subscriptions, dynamic pricing, and loyalty campaigns plug into the
existing abstractions (services + hooks + `ServiceMode`/`OrderChannel` + payment
providers + Money DTOs) without redesign.
