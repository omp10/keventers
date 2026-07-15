# Payment Engine (Phase 4.8)

The **single financial source of truth**. It owns Payment Intents, Payments,
the immutable Transaction ledger, Refunds, Invoices, Settlements (abstraction),
Webhooks and per-restaurant Provider Configuration. It is **provider-agnostic**,
it **never calculates prices** (it consumes the order's immutable Pricing-Engine
snapshot), and it **never mutates orders** — it uses the sanctioned
`orderService.recordPaymentStatus` seam and publishes provider-independent
domain events. All money is **integer minor units** via the shared `Money` value
object; there is no floating-point arithmetic anywhere.

## Provider abstraction (Adapter / Strategy + Factory)

Every gateway implements one common interface — the services depend only on it
and never reference Razorpay/PhonePe:

```
createPaymentIntent · fetchPayment · verifyPayment · capturePayment
cancelPayment · refundPayment · verifyWebhook · parseWebhook · generateCheckoutPayload
```

`ProviderFactory` is a registry: `register(name, Class)` adds a gateway
(Cashfree/Stripe/PayU/Juspay/Paytm) with **no service change**. Razorpay and
PhonePe ship production-ready:

| Gateway | Handshake verify | Webhook verify |
| --- | --- | --- |
| **Razorpay** | `HMAC_SHA256(order_id\|payment_id, keySecret)` vs `razorpay_signature` | `HMAC_SHA256(rawBody, webhookSecret)` vs `X-Razorpay-Signature` |
| **PhonePe** | `SHA256(base64Response + saltKey)` vs `X-VERIFY` hash | `SHA256(rawBody + saltKey)` vs `X-VERIFY` hash |

All comparisons are constant-time (`timingSafeEqual`). Gateway HTTP calls go
through an injected client; the crypto (the security-critical part) is pure and
fully unit-tested.

### Credential security

Credentials are encrypted at rest with the existing Security Platform
(AES-256-GCM) and stored in `*Enc` fields (`select:false`). **`resolveProvider()`
in the config service is the ONLY place that decrypts** — it instantiates the
adapter via the factory and hands the payment service a ready provider. The
service never sees secrets and never learns which gateway it received. The config
DTO exposes only `credentialsConfigured: boolean` — never a secret, encrypted or
otherwise.

## Payment lifecycle

```
createIntent ─► PENDING ──► (customer pays on gateway) ──► confirm ─┐
                                                                    ├─► #settle
webhook (razorpay/phonepe) ─────────────────────────────────────── ┘   (idempotent by providerPaymentRef)
        │                                                               │
        └─ verify signature → dedup → resolve order                     ├─ Payment (AUTHORIZED|CAPTURED)
                                                                        ├─ Transaction ledger (AUTHORIZATION[, CAPTURE])
                                                                        ├─ order.recordPaymentStatus(...)  (seam, never mutate)
                                                                        └─ Invoice on full payment
```

`#settle` is shared by customer-confirm **and** webhooks and is idempotent by the
provider payment ref — a confirm racing its webhook produces exactly one payment
and one ledger entry. The order is only marked fully **CAPTURED** once the
cumulative settled amount covers the order total.

### Multi-payment (split tender)

One order supports many tenders (e.g. ₹800 PhonePe + ₹200 cash). Each intent may
carry a partial `amount`; the remaining balance = order total − Σ settled. Cash /
counter tenders are recorded via `recordManualPayment` (staff-initiated, no
gateway) and count toward the same balance.

## Immutable ledger & invoices

Transactions are **append-only** — enforced at the model (pre-hooks blocking
update paths) *and* repository layer (every update method rejects). Invoices are
immutable snapshots (unique `orderId + invoiceNumber`); PDF generation is behind
a `PdfGenerator` interface (no-op default) so a real renderer drops in without
touching the service.

## Webhooks — the async security boundary

`POST /api/v1/webhooks/{razorpay,phonepe}` — **unauthenticated** (signature is
the auth). Each inbound webhook enforces, in order:

1. **Parse without credentials** (JSON only) to learn the event id + refs.
2. **Replay / idempotency** — durable `(provider, eventId)` unique index +
   Redis fast-path claim.
3. **Resolve** the owning order + tenant scope (by payment ref, else intent ref).
4. **Signature** verification against the *resolved restaurant's* secret.
5. **Apply once** via the payment orchestrator; mark the record PROCESSED.

The exact provider-signed bytes are captured via an `express.json` `verify`
callback (`req.rawBody`) so signatures match byte-for-byte.

## Provider-independent events (never gateway-specific)

`PaymentIntentCreated · PaymentAuthorized · PaymentCaptured · PaymentFailed ·
PaymentCancelled · RefundRequested · RefundCompleted · RefundFailed ·
InvoiceGenerated · SettlementCreated · SettlementCompleted`. Order, Kitchen,
Notifications, Analytics and Loyalty consume these clean domain events — never a
Razorpay/PhonePe payload. Socket.IO pushes `PaymentPending/Authorized/Captured/
Failed` and `RefundCompleted` to restaurant dashboards (best-effort).

## Refunds

Full or partial, staff/admin only. Execution is delegated to the provider
adapter; the service owns the lifecycle, records the immutable ledger, and
guarantees cumulative refunds never exceed the captured amount
(duplicate-refund prevention via `sumActiveForPayment` + idempotency key). The
payment moves to `PARTIALLY_REFUNDED` / `REFUNDED` accordingly.

## Redis usage

Payment locks (`pay:lock:*`), idempotency (`pay:idem:*`), webhook dedup
(`pay:webhook:*`) and temporary payment sessions (`pay:session:*`).

## API surface

| Audience | Mount |
| --- | --- |
| Customer | `POST /api/v1/payments/create-intent`, `POST /api/v1/payments/confirm`, `GET /api/v1/payments/:id` |
| Restaurant | `/api/v1/restaurant/{payments,transactions,refunds,invoices,payment-config}` |
| Admin | `/api/v1/admin/{payments,transactions,settlements}` |
| Webhooks | `/api/v1/webhooks/{razorpay,phonepe}` (unauthenticated) |

The module registers **before** the organization module so these specific paths
win while every other `/restaurant/*` and `/admin/*` request falls through to the
organization routers.

## Permissions

Core `payment:*` CRUD comes from the identity catalog. The `008-payment-core`
seeder adds `payment:refund`, `payment:config`, `settlement:read`,
`settlement:manage`.

## Tests

Provider crypto (signature/checksum verify + parse), payment service (settle,
idempotency, multi-payment, failure), refund (full/partial, over-refund
prevention, idempotency), webhook (verify → dedup → process, replay, bad
signature), intent (Pricing-snapshot amount, idempotency, balance guards),
ledger immutability, DTO secret-hygiene, and an HTTP integration suite for wiring
+ auth boundaries.
