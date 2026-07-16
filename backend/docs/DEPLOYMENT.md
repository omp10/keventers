# Deployment & Operations Runbook

Operational guide for running the Keventers backend in production when the
frontend is deployed separately on Vercel and only the backend stack runs on
your VPS. This pairs with the architecture docs (`docs/*.md`) and `README.md`.

## Recommended topology

- Frontend: Vercel
- Backend API + Socket.IO ingress: VPS behind Nginx
- Background workers: separate process/container on the same VPS today, easy to move out later
- Redis: local container or managed Redis
- MongoDB: MongoDB Atlas or a dedicated external MongoDB deployment

The production compose file is intentionally backend-only:

- `api` serves REST + Socket.IO
- `worker` runs BullMQ processors independently of the API
- `redis` handles cache, locks, queues, rate limits, and Socket.IO pub/sub
- `nginx` proxies public traffic to the API container

## Runtime

- Node.js >= 18, MongoDB, Redis
- Docker: `Dockerfile` plus `docker-compose.prod.yml`
- PM2: `ecosystem.config.js` now includes both `keventers-api` and `keventers-worker`

## Environment configuration

Config is validated at boot by `src/config/env.schema.js`. In `NODE_ENV=production`
the process fails fast if security-critical values are missing or permissive defaults
are still in place.

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGO_URI` | always | point this at MongoDB Atlas or your external MongoDB host |
| `REDIS_HOST` / `REDIS_PORT` | always | BullMQ + cache + locks + rate limit + Socket.IO adapter |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | always | distinct secrets |
| `ENCRYPTION_KEY` | production | required for encrypted payment credentials |
| `API_KEY_PEPPER` | production | required for API-key hashing |
| `CORS_ORIGIN` / `SOCKET_CORS_ORIGIN` | production | set these to your Vercel frontend URL(s), never `*` |
| `QR_PUBLIC_BASE_URL` | recommended | use the public backend URL, for example `https://api.example.com/scan` |
| `STORAGE_PUBLIC_BASE_URL` | when using local storage | should also use the public backend URL |
| `SOCKET_REDIS_ADAPTER` | true for scaling | keep enabled for multi-instance Socket.IO |

Example production origins:

```env
CORS_ORIGIN=https://keventers.vercel.app,https://admin-keventers.vercel.app
SOCKET_CORS_ORIGIN=https://keventers.vercel.app,https://admin-keventers.vercel.app
QR_PUBLIC_BASE_URL=https://api.keventers.example/scan
STORAGE_PUBLIC_BASE_URL=https://api.keventers.example/static
```

## Process layout

API process:

1. Connect Mongo + Redis.
2. Register core dependencies and business modules.
3. Start Express and Socket.IO.
4. Start BullMQ workers.

Worker process:

1. Connect Mongo + Redis.
2. Register the same module graph.
3. Start BullMQ workers without binding an HTTP port.

That worker entrypoint lives in `src/worker.js`, so queue capacity can now be
scaled separately from the API.

## Health & readiness

- `GET /health`: liveness
- `GET /ready`: readiness for MongoDB + Redis
- `GET /metrics`: Prometheus metrics

The production compose file uses `/ready` for the API container healthcheck.

## Backend-only Docker deployment

Use `docker-compose.prod.yml` on the VPS. It does not include the frontend,
because the frontend is expected to run on Vercel.

1. Create `backend/.env.production` from `.env.example`.
2. Set `NODE_ENV=production`.
3. Replace wildcard `CORS_ORIGIN` and `SOCKET_CORS_ORIGIN` with your Vercel URL(s).
4. Point `MONGO_URI` at MongoDB Atlas or your dedicated MongoDB host.
5. Start the stack:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Nginx notes

- `ops/nginx/backend.conf` includes WebSocket upgrade support for Socket.IO.
- The config rate-limits generic API traffic and leaves `/health` and `/ready` cheap.
- Add SSL termination at Cloudflare or extend Nginx with TLS server blocks before going live.

## Horizontal scaling

- The API is stateless and can sit behind a load balancer.
- Keep `SOCKET_REDIS_ADAPTER=true` so broadcasts work across API instances.
- BullMQ workers can now scale independently by increasing worker replicas only.
- Redis remains the shared coordination point for locks, queues, cache, and Socket.IO.

## Graceful shutdown

- API drains HTTP first, then closes Socket.IO, workers, Redis, and MongoDB.
- Worker drains BullMQ jobs, then closes Redis and MongoDB.

Both paths are bounded by `SHUTDOWN_TIMEOUT_MS`.
