# Keventers Smart Ordering Platform — Backend Architecture

> **Status:** Architecture blueprint (no business features implemented yet).
> **Style:** Enterprise-grade **Modular Monolith**, designed for clean extraction into microservices.
> **Stack:** Node.js · TypeScript · Express · MongoDB (Mongoose) · In-process Event Bus (pluggable to Kafka/RabbitMQ).

---

## 1. Architectural Philosophy

The system is a **modular monolith**: a single deployable process composed of strongly-isolated **business modules** that communicate through **explicit contracts** (service interfaces + events), never by reaching into each other's internals.

This gives us:

- **Today:** one deployable, one database connection pool, one CI/CD pipeline, low operational cost, transactional simplicity.
- **Tomorrow:** any module can be lifted into its own service because its boundary is already a hard seam (own routes, own models, own repositories, own events, no shared mutable state).

### The Dependency Rule (Clean Architecture)

Dependencies point **inward only**. Outer layers know about inner layers; inner layers know nothing about outer layers.

```
        ┌─────────────────────────────────────────────┐
        │  Routes / Controllers / Middleware (HTTP)    │  ← Interface / Delivery layer
        │  knows Services                              │
        ├─────────────────────────────────────────────┤
        │  Services (Use cases / business logic)       │  ← Application layer
        │  knows Repository INTERFACES + Domain + Events│
        ├─────────────────────────────────────────────┤
        │  Domain Models / DTOs / Domain Events        │  ← Domain layer (framework-free)
        ├─────────────────────────────────────────────┤
        │  Repositories (impl) / Mongoose Schemas /    │  ← Infrastructure layer
        │  Event Bus impl / External clients           │
        └─────────────────────────────────────────────┘
```

Concrete rules:

1. A **Controller** may depend on a **Service interface**. It may NOT import a Repository, a Mongoose model, or another module's internals.
2. A **Service** may depend on **Repository interfaces**, the **Event Bus interface**, DTOs, domain models, and other **Service interfaces of the same module**. It may NOT import Express (`req`/`res`), Mongoose, or another module's repository.
3. A **Repository** is the **only** layer allowed to import Mongoose / touch MongoDB. It returns **domain objects / plain DTOs**, never leaks Mongoose `Document` types upward.
4. **Cross-module** communication happens through **published events** (async, preferred) or an **injected service interface** exposed via that module's public `index.ts` (sync, when a direct answer is required). Never through direct file imports of another module's internals.

> Enforced mechanically by ESLint `no-restricted-imports` + dependency-cruiser rules (see §14).

---

## 2. Engineering Principles → Where They Live

| Principle | Manifestation in this architecture |
|---|---|
| **Clean Architecture** | 4-layer inward dependency rule (§1) |
| **SOLID** | Interfaces for every Service & Repository (DIP/ISP); one reason to change per class (SRP); modules open for extension via events (OCP) |
| **DRY** | `shared/` module for cross-cutting concerns; `BaseRepository`, `BaseService`, base error classes |
| **KISS** | In-process event bus first; sync service calls when simplest; no premature message broker |
| **Repository Pattern** | `IRepository<T>` abstraction + `BaseRepository` (Mongoose) impl per module |
| **Service Layer** | All business logic in Services behind interfaces |
| **Modular Monolith** | Feature modules with hard boundaries + public barrels |
| **Event-Driven Design** | `IEventBus` abstraction; domain events per module |
| **Dependency Injection** | Lightweight DI container; constructor injection everywhere |

---

## 3. Top-Level Folder Structure

```
keventers-backend/
├── src/
│   ├── main.ts                     # Composition root: build container, wire app, start server
│   ├── app.ts                      # Express app factory (middleware pipeline, mount routers)
│   ├── server.ts                   # HTTP server lifecycle (listen, graceful shutdown)
│   │
│   ├── config/                     # Configuration module (§7)
│   │   ├── index.ts                # Typed, validated, frozen config object (single export)
│   │   ├── env.schema.ts           # Zod schema for process.env
│   │   ├── config.types.ts
│   │   └── loaders/
│   │       ├── database.config.ts
│   │       ├── server.config.ts
│   │       ├── logger.config.ts
│   │       └── eventbus.config.ts
│   │
│   ├── core/                       # Framework kernel — no business logic (§4)
│   │   ├── di/
│   │   │   ├── container.ts         # DI container (register / resolve)
│   │   │   ├── tokens.ts            # Injection tokens (symbols)
│   │   │   └── container.types.ts
│   │   ├── database/
│   │   │   ├── mongoose.connection.ts   # Connect / disconnect / health
│   │   │   └── transaction.manager.ts   # Session/transaction helper
│   │   ├── eventbus/
│   │   │   ├── event-bus.interface.ts   # IEventBus (§10)
│   │   │   ├── in-memory-event-bus.ts   # Default impl
│   │   │   ├── domain-event.ts          # DomainEvent<TPayload> base
│   │   │   └── event-registry.ts        # Handler registration
│   │   ├── repository/
│   │   │   ├── repository.interface.ts  # IRepository<T> (§9)
│   │   │   └── base.repository.ts       # Mongoose BaseRepository<T>
│   │   ├── service/
│   │   │   └── base.service.ts          # Optional BaseService helpers
│   │   ├── http/
│   │   │   ├── base.controller.ts       # Response envelope helpers only
│   │   │   ├── async-handler.ts         # Wraps async controllers → next(err)
│   │   │   ├── api-response.ts          # Standard success/error envelope
│   │   │   └── route-registry.ts        # Collects & mounts module routers
│   │   ├── errors/                      # Error taxonomy (§12)
│   │   │   ├── app-error.ts             # Base AppError
│   │   │   ├── domain-error.ts
│   │   │   ├── validation-error.ts
│   │   │   ├── not-found-error.ts
│   │   │   ├── conflict-error.ts
│   │   │   ├── unauthorized-error.ts
│   │   │   ├── forbidden-error.ts
│   │   │   └── error-codes.ts           # Enum of stable machine codes
│   │   ├── logging/                     # Logging strategy (§11)
│   │   │   ├── logger.interface.ts      # ILogger
│   │   │   ├── pino.logger.ts           # Impl
│   │   │   └── request-context.ts       # AsyncLocalStorage (correlationId)
│   │   ├── validation/                  # Validation strategy (§8)
│   │   │   ├── validator.interface.ts
│   │   │   ├── zod.validator.ts
│   │   │   └── validate.middleware.ts   # body/params/query validation
│   │   └── types/
│   │       ├── result.ts                # Result<T, E> helper (optional)
│   │       └── pagination.ts            # PageRequest / PageResult<T>
│   │
│   ├── middleware/                 # Global middleware pipeline (§6)
│   │   ├── correlation-id.middleware.ts
│   │   ├── request-logger.middleware.ts
│   │   ├── authentication.middleware.ts
│   │   ├── authorization.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── security-headers.middleware.ts   # helmet, cors
│   │   ├── body-parser.middleware.ts
│   │   ├── not-found.middleware.ts          # 404 fallthrough
│   │   └── error-handler.middleware.ts      # Terminal error mapper (must be LAST)
│   │
│   ├── shared/                     # Shared module — reusable, business-agnostic (§5)
│   │   ├── constants/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── dtos/                   # Cross-cutting DTOs (e.g. Money, Address)
│   │   ├── value-objects/
│   │   └── index.ts               # Public barrel
│   │
│   ├── modules/                    # Business modules (§13) — the heart of the monolith
│   │   ├── identity/               # auth, users, roles
│   │   ├── catalog/                # products, categories, menu
│   │   ├── outlet/                 # stores/franchise outlets
│   │   ├── cart/                   # cart / basket
│   │   ├── order/                  # order lifecycle
│   │   ├── payment/                # payment orchestration (no card data stored)
│   │   ├── inventory/              # stock
│   │   ├── promotion/              # offers, coupons, loyalty
│   │   ├── notification/           # email/SMS/push (event consumer)
│   │   └── analytics/              # reporting projections (event consumer)
│   │
│   └── api/
│       └── v1/
│           └── router.ts           # Aggregates all module routers under /api/v1
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .eslintrc.cjs                   # includes dependency boundary rules
├── dependency-cruiser.cjs          # architectural fitness function
├── tsconfig.json
├── package.json
└── ARCHITECTURE.md
```

---

## 4. `core/` — The Framework Kernel

`core/` contains **infrastructure and abstractions with zero business knowledge**. It is the only place allowed to know about Express, Mongoose, Pino, etc. as *implementations of interfaces*. Business modules depend on `core` **interfaces**, not `core` implementations directly (wiring happens in the composition root).

Think of `core/` as "the private framework Keventers built on top of Express + Mongoose." If we swapped Express for Fastify, only `core/http` and `middleware/` change.

---

## 5. `shared/` Module

**Purpose:** genuinely reusable, **business-agnostic** helpers that more than one module needs — and nothing more.

- `constants/` — HTTP status maps, regex, generic enums (currencies, locales).
- `utils/` — pure functions: `dateUtils`, `stringUtils`, `idUtils`, `moneyUtils`. Must be **side-effect free and stateless**.
- `value-objects/` — `Money`, `Email`, `PhoneNumber`, `Address` (immutable, self-validating).
- `dtos/` / `types/` — shared shapes referenced across modules.

**Strict rule:** `shared/` may **not** import from `modules/`, `core/`, `config/`, or `middleware/`. It is a **leaf** of the dependency graph. If something in `shared/` needs a business concept, it doesn't belong in `shared/`. This keeps it extractable into an npm package for future services.

---

## 6. Middleware Architecture

Middleware is ordered as a deliberate **pipeline**. Order is load-bearing.

```
Incoming Request
      │
 1. securityHeaders (helmet, cors)
 2. bodyParser (json, urlencoded, size limits)
 3. correlationId        → generates/propagates X-Correlation-Id into AsyncLocalStorage
 4. requestLogger        → logs inbound request (uses correlationId)
 5. rateLimit            → per-IP / per-user throttling
 6. authentication       → verifies JWT, attaches req.principal (NO authorization decision)
 7. authorization        → route-level RBAC/permission guard
      │
 8. ─────── Route → Validation Middleware → Controller → Service → Repository ───────
      │
 9. notFound             → unmatched routes → NotFoundError
10. errorHandler         → TERMINAL: maps any error → standard JSON envelope + status
```

Principles:

- **Authentication ≠ Authorization** (SRP): one verifies *who you are*, the other *what you may do*.
- Middleware handles **HTTP/cross-cutting concerns only** — never business rules.
- `errorHandler` is **always mounted last** and is the single place that converts errors to responses (§12).
- Route-specific middleware (validators, guards) is declared **in the module's `routes` file**, not globally.

---

## 7. Configuration Module

- **Single source of truth:** all `process.env` access happens **only** inside `config/`. No other file reads `process.env`.
- **Fail-fast validation:** `env.schema.ts` (Zod) parses & validates env at boot. Missing/invalid → process exits with a clear message **before** the server listens.
- **Typed & frozen:** `config/index.ts` exports one deeply-`Object.freeze`d, fully-typed object. Consumers import `config`, never raw env.
- **Namespaced loaders:** `database.config.ts`, `server.config.ts`, etc. compose into the root config. Enables per-domain defaults and future per-service extraction.
- **Environments:** driven by `NODE_ENV`; secrets come from the environment / secret manager, never committed. `.env.example` documents every key.

```ts
// usage everywhere
import { config } from '@config';
mongoose.connect(config.database.uri);
```

---

## 8. Validation Strategy

**Two-tier validation** (defense in depth), both driven by **Zod schemas** to stay DRY:

1. **Boundary (transport) validation** — `validate.middleware.ts` validates `body` / `params` / `query` against the route's DTO schema **before** the controller runs. Rejects malformed input with `422 VALIDATION_ERROR` and a structured field-error list. Also **coerces & strips** unknown fields → the controller receives a clean, typed DTO.
2. **Domain (invariant) validation** — Services and Value Objects enforce **business rules** that transport validation can't know (e.g., "order total ≥ minimum", "coupon not expired", "outlet is open"). These throw `DomainError`.

Rules:

- Schemas live in each module's `validators/` folder and are the **DTO source of truth** (`z.infer` produces the DTO type → one definition, no drift).
- Mongoose schema validation is treated as a **last-line integrity guard**, not the primary strategy.

---

## 9. Repository Abstraction

**Repositories are the ONLY layer that touches MongoDB.** Services depend on the **interface**, injected by the container — so a module can be tested with an in-memory fake and later repointed at a different datastore without touching business logic.

```ts
// core/repository/repository.interface.ts
export interface IRepository<T, ID = string> {
  create(data: Partial<T>, ctx?: UnitOfWork): Promise<T>;
  findById(id: ID): Promise<T | null>;
  findOne(filter: Query<T>): Promise<T | null>;
  find(filter: Query<T>, page?: PageRequest): Promise<PageResult<T>>;
  updateById(id: ID, patch: Partial<T>, ctx?: UnitOfWork): Promise<T | null>;
  deleteById(id: ID, ctx?: UnitOfWork): Promise<boolean>;
  exists(filter: Query<T>): Promise<boolean>;
}
```

- `BaseRepository<T>` implements this against a Mongoose model and **maps `Document` → domain object** (`toDomain`) so Mongoose types never leak upward.
- Module repositories extend `BaseRepository` and add **intent-revealing** methods: `orderRepository.findActiveByOutlet(outletId)` — never generic `find` calls scattered in services.
- `UnitOfWork` (Mongoose `ClientSession`) is passed through for **multi-document transactions**, managed by `transaction.manager.ts` in the service layer.
- Repositories return **domain models / DTOs**, accept **filters/DTOs** — no `req`, no HTTP, no business decisions.

---

## 10. Service Abstraction & Event Bus

### Service layer

- Every service has an **interface** (`IOrderService`) and an impl (`OrderService`), wired via DI token. This is where **all business logic and orchestration** live.
- A service may **compose repositories, publish events, call other service interfaces**, and manage transactions. It is framework-free and unit-testable with mocked dependencies.
- Services return **DTOs/domain objects**, throw **domain/app errors** — they never format HTTP responses.

### Event Bus abstraction

```ts
// core/eventbus/event-bus.interface.ts
export interface IEventBus {
  publish<T>(event: DomainEvent<T>): Promise<void>;
  subscribe<T>(eventName: string, handler: EventHandler<T>): void;
}

export abstract class DomainEvent<T> {
  readonly occurredAt: Date;
  readonly correlationId: string;
  abstract readonly name: string;   // e.g. "order.placed"
  constructor(public readonly payload: T) { /* stamp metadata */ }
}
```

- **Default impl:** `InMemoryEventBus` (synchronous/async in-process dispatch) — KISS, no broker needed to start.
- **Migration seam:** because everyone codes to `IEventBus`, swapping in a `KafkaEventBus` / `RabbitMqEventBus` is a **one-line container change**, not a code rewrite. This is the primary lever for the monolith→microservices split.
- **Naming:** events are past-tense facts — `order.placed`, `payment.captured`, `inventory.depleted`.
- **Usage:** `order` module publishes `OrderPlacedEvent`; `notification`, `inventory`, and `analytics` modules **subscribe** without `order` knowing they exist → **OCP + loose coupling**. Cross-module side effects flow through events, keeping boundaries clean for extraction.

---

## 11. Logging Strategy

- **Abstraction first:** code depends on `ILogger`, impl is **Pino** (structured JSON). Swappable.
- **Structured, not string-y:** every log is an object → machine-queryable in ELK/Datadog.
- **Correlation IDs:** `correlation-id.middleware` stores a per-request id in **`AsyncLocalStorage`**; the logger auto-injects it, so a single request is traceable end-to-end across services and event handlers **without threading the id through every function**.
- **Levels:** `error` (handled failures), `warn` (recoverable/anomalies), `info` (lifecycle & business milestones), `debug` (dev diagnostics). Level is config-driven per environment.
- **Discipline:** **no `console.log` anywhere** (ESLint-enforced). **Never log secrets/PII/tokens/card data** — a redaction serializer strips known-sensitive keys.

---

## 12. Error Handling Strategy

**Centralized, typed, and predictable.**

- **Error taxonomy** (`core/errors`): a base `AppError { statusCode, code, message, isOperational, details? }`, subclassed into `ValidationError (422)`, `NotFoundError (404)`, `ConflictError (409)`, `UnauthorizedError (401)`, `ForbiddenError (403)`, `DomainError (422)`.
- **Stable machine codes** (`error-codes.ts` enum, e.g. `ORDER_ALREADY_PAID`) — clients branch on `code`, never on human-readable `message`.
- **Throw, don't return:** services/repositories **throw** typed errors. Controllers are wrapped in `async-handler` so rejections flow to `next(err)` automatically — no try/catch clutter.
- **Single terminal handler:** `error-handler.middleware` (mounted last) maps any error → the standard envelope, sets status, logs with correlation id. **Operational** errors (expected, e.g. `NotFoundError`) return their detail; **programmer/unknown** errors return a generic `500 INTERNAL_ERROR` (details hidden in prod, full stack logged).
- **Consistent envelope** (success & error):

```jsonc
// success
{ "success": true,  "data": { /* ... */ }, "meta": { "correlationId": "...", "page": {...} } }
// error
{ "success": false, "error": { "code": "ORDER_NOT_FOUND", "message": "...", "details": [] },
  "meta": { "correlationId": "..." } }
```

---

## 13. Anatomy of a Business Module

Every module under `modules/` is **self-contained and owns its full vertical slice**. Example: `order`.

```
modules/order/
├── controllers/
│   └── order.controller.ts        # HTTP in/out only; delegates to IOrderService
├── services/
│   ├── order.service.interface.ts # IOrderService
│   └── order.service.ts           # ALL business logic + orchestration
├── repositories/
│   ├── order.repository.interface.ts
│   └── order.repository.ts        # extends BaseRepository; ONLY Mongoose access
├── models/
│   ├── order.model.ts             # Mongoose schema (infrastructure)
│   └── order.domain.ts            # Framework-free domain type
├── validators/
│   └── order.validators.ts        # Zod schemas → DTO source of truth
├── dtos/
│   ├── create-order.dto.ts
│   └── order-response.dto.ts
├── events/
│   ├── order-placed.event.ts
│   ├── order-cancelled.event.ts
│   └── handlers/                  # this module's subscribers to OTHER modules' events
├── constants/
│   └── order.constants.ts         # statuses, error codes, limits
├── routes/
│   └── order.routes.ts            # path + method + guards + validators + controller
├── utils/
│   └── order.utils.ts             # module-local pure helpers
├── order.module.ts                # registers this module's providers in the DI container
└── index.ts                       # PUBLIC BARREL: exports only what other modules may use
```

### Module boundary rules

- **`index.ts` is the only public surface.** Other modules import `IOrderService` / published events from `modules/order` — nothing else. Controllers, repositories, models, validators are **private** to the module.
- **No lateral internal imports.** `payment` must not import `order/repositories/...`. It uses `IOrderService` (injected) or reacts to `order.*` events.
- **Own database collections.** A module reads/writes **only its own** collections. Need another module's data? Ask via its service, or maintain a **read projection** built from its events (the pattern that makes future DB-per-service trivial).
- **`*.module.ts`** registers the module's controllers/services/repositories/event-handlers into the DI container. `main.ts` composes all modules.

### Module boundary map (selected flows)

```
identity ──(auth principal)──► every module (via middleware)
cart ──"cart.checked_out"──► order
order ──"order.placed"──────► payment, inventory, notification, analytics
payment ──"payment.captured"► order (advances status), notification, analytics
promotion ──IPromotionService (sync)──► order (price calc at checkout)
```

---

## 14. Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Folders | `kebab-case`, plural for collections | `repositories/`, `event-bus/` |
| Files | `kebab-case.role.ts` | `order.service.ts`, `create-order.dto.ts` |
| Classes | `PascalCase` + role suffix | `OrderService`, `OrderRepository`, `OrderController` |
| Interfaces | `PascalCase`, `I` prefix for injected contracts | `IOrderService`, `IRepository`, `ILogger` |
| DI tokens | `PascalCase` symbol in `tokens.ts` | `TOKENS.OrderService` |
| Domain events | dot-namespaced, **past tense** | `order.placed`, `payment.captured` |
| Event classes | `PascalCase` + `Event` | `OrderPlacedEvent` |
| DTO types | `PascalCase` + `Dto` | `CreateOrderDto`, `OrderResponseDto` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_ITEMS_PER_ORDER` |
| Error codes | `SCREAMING_SNAKE_CASE` enum | `ORDER_ALREADY_PAID` |
| Mongoose models | `PascalCase` singular | `Order`, `Outlet` |
| Routes / URLs | `kebab-case`, plural nouns | `POST /api/v1/orders` |
| Env vars | `SCREAMING_SNAKE_CASE`, namespaced | `MONGO_URI`, `JWT_ACCESS_SECRET` |

---

## 15. API Versioning

- **URI-based versioning:** `/api/v1/...`. Explicit, cache-friendly, trivially routable at a future gateway.
- **`api/v{n}/router.ts`** aggregates module routers for that version; modules expose version-agnostic controllers, and a version adapter maps them in. A breaking change spawns `api/v2/` reusing services where compatible — **no forced big-bang upgrade**.
- **Deprecation policy:** old versions run in parallel; responses carry `Deprecation` / `Sunset` headers before removal.
- **Contract stability:** versioning covers **transport DTOs**; internal domain models evolve freely behind them.

---

## 16. Dependency Injection

- **Lightweight container** (`core/di/container.ts`) with **injection tokens** (symbols in `tokens.ts`) — avoids fragile string keys and enables interface-based resolution.
- **Constructor injection everywhere.** No `new OrderRepository()` inside a service; the container supplies dependencies. → satisfies **DIP**, makes everything mockable.
- **Composition root = `main.ts`.** This is the *only* place that knows concrete implementations. It: builds config → connects DB → registers `core` impls (`PinoLogger`, `InMemoryEventBus`, repositories) → calls each `*.module.ts` to register providers → builds the Express app → starts the server.
- **Lifetimes:** singletons for stateless services/repositories/logger/event-bus; per-request scope (via `AsyncLocalStorage`) for request context.

---

## 17. Dependency Rules (Enforced)

Allowed import directions (`A → B` means "A may import B"):

```
modules/*  → core (interfaces), shared, config
core       → shared, config
middleware → core, config, shared
config     → shared
shared     → (nothing internal — leaf)

modules/A  →  modules/B   ONLY via modules/B/index.ts (public barrel)
controllers→ services (interfaces)          [never repositories]
services   → repositories (interfaces), IEventBus, other service interfaces
repositories → Mongoose / MongoDB           [exclusive DB access]
```

Forbidden (ESLint `no-restricted-imports` + `dependency-cruiser`, fails CI):

- ❌ Controller importing a Repository or Mongoose model.
- ❌ Any file outside `repositories/` importing Mongoose models.
- ❌ Any file outside `config/` reading `process.env`.
- ❌ Cross-module deep imports (`modules/x/services/...` from module `y`).
- ❌ `shared/` importing `modules/`, `core/`, `config/`, or `middleware/`.
- ❌ `console.*` in application code.

These rules are a **fitness function**: the architecture is verified on every commit, not just documented.

---

## 18. Why This Migrates Cleanly to Microservices

Each business module already has: its own routes, controllers, services, **its own collections**, its own events, and **zero direct coupling** to peers (only public barrels + events). To extract `payment` into a service you:

1. Repoint `IEventBus` from in-memory to a broker (already an interface — §10).
2. Replace the in-process `IPaymentService` call sites with an HTTP/gRPC client behind the **same interface**.
3. Move `modules/payment/` + its collections to a new deployable using the identical layout.

No business logic changes. The seams were designed in from day one.

---

## 19. What Is Intentionally NOT in This Document

Per scope, **no business features are designed or implemented** — no order pricing rules, no payment provider selection, no menu schema. This document defines the **skeleton, boundaries, and rules** into which those features will be built next.
```
