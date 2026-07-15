# Seeding & Bootstrap

The platform ships with a **seed runner** (`src/database/seeds/`) that applies
registered seeders exactly once per installation, tracked in a `_seeds` ledger
collection. Seeders are also **internally idempotent** (create-if-missing), so
re-running never duplicates data even if the ledger is reset.

## Identity seeder

`001-identity-core` ([src/modules/identity/seeds/identity.seeder.js](../src/modules/identity/seeds/identity.seeder.js))
bootstraps a brand-new install so the platform is usable immediately. It:

1. **Permissions** — seeds the concrete permission catalog: CRUD (`create/read/update/delete`)
   for every resource (`identity, organization, restaurant, branch, table, qr, menu,
   category, product, modifier, customer, cart, order, payment, notification,
   analytics, settings`) plus the granular identity permissions used by the IAM routes.
2. **Roles** — seeds production roles with default grants: **Platform Super Admin,
   Organization Admin, Restaurant Manager, Kitchen Manager, Cashier, Waiter, Staff,
   Customer**.
3. **Platform Super Admin** — creates the initial admin account (verified, active,
   `super_admin` role, password hashed via `PasswordService`).
4. **Default organization** — optional/configurable; currently **deferred** (the
   Organization module and the user→org link do not exist yet).

It reuses existing abstractions only — repositories (data), `PasswordService`
(hashing), the RBAC registries, the event bus, and the audit logger — and never
touches MongoDB directly.

### Wildcards

Concrete `resource:action` permissions are stored as catalog rows. Wildcard grants
(`*`, `resource:*`) live in **role** grants and are resolved by the RBAC policy
evaluator at authorization time (e.g. `identity:*` grants `identity:user:read`).

### Events & audit

On **first creation only**, the seeder publishes `PermissionCreated`, `RoleCreated`,
and `UserCreated` events, and writes audit records for permission/role/super-admin
creation. Re-runs create nothing and emit nothing.

## Configuration

Set these in `.env` before running the seed (validated by the config module):

| Variable                  | Required | Purpose                                   |
| ------------------------- | -------- | ----------------------------------------- |
| `PLATFORM_ADMIN_NAME`     | yes      | Full name of the initial admin            |
| `PLATFORM_ADMIN_EMAIL`    | yes      | Admin login email                         |
| `PLATFORM_ADMIN_PASSWORD` | yes      | Admin password (hashed, never stored raw) |
| `PLATFORM_ADMIN_PHONE`    | no       | Admin phone                               |
| `SEED_DEFAULT_ORG_ENABLED`| no       | Enable default-org seeding (deferred)     |
| `SEED_DEFAULT_ORG_NAME`   | no       | Default organization name                 |

The variables are **optional at process level** (the server boots without them);
the seeder validates their presence when it runs and fails fast with a clear error.

## How to run

```bash
# 1. ensure MongoDB + Redis are up (e.g. docker compose up mongo redis)
# 2. set PLATFORM_ADMIN_* in .env
npm run seed
```

## How to reset (rollback)

Removes only the system records this seeder created (permission catalog, system
roles, and the configured admin) — never operator-created data:

```bash
npm run seed -- --rollback
```

## How to customize the initial admin

Edit the `PLATFORM_ADMIN_*` variables in `.env`, then run `npm run seed`. If an
account with that email already exists, the seeder skips it (idempotent) — change
the email to provision a different admin, or roll back first to replace it.

## Adding future seeders / migrations

Register a new seeder instance in
[src/database/seeds/seed-registry.js](../src/database/seeds/seed-registry.js) with a
new, higher `name` (e.g. `002-...`). The runner applies it once and records it in
the ledger; existing seeders are untouched.
