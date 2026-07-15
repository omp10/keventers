# ───────────────────────────── Build stage ─────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ───────────────────────────── Runtime stage ────────────────────────────
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Install tini for correct signal forwarding (graceful shutdown).
RUN apk add --no-cache tini

# Run as an unprivileged user.
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER app
EXPOSE 4000

# tini as PID 1 → forwards SIGINT/SIGTERM to Node for graceful shutdown.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]

# Container-level health probe hitting the liveness endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1
