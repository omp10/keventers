#!/usr/bin/env bash

set -Eeuo pipefail

APP_ROOT="${APP_ROOT:-/opt/keventers}"
REPO_URL="${REPO_URL:-https://github.com/omp10/keventers.git}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
API_INSTANCES="${API_INSTANCES:-2}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:5001/ready}"

REPO_DIR="$APP_ROOT/repository"
RELEASES_DIR="$APP_ROOT/releases"
SHARED_DIR="$APP_ROOT/shared"
CURRENT_LINK="$APP_ROOT/current"
LOCK_FILE="$APP_ROOT/deploy.lock"

log() {
  printf '[keventers-deploy] %s\n' "$*"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    log "Required command not found: $1"
    exit 1
  }
}

start_keventers() {
  local release="$1"

  # These exact names isolate Keventers from every other PM2 application.
  pm2 delete keventers-api keventers-worker >/dev/null 2>&1 || true

  cd "$release"
  pm2 start src/server.js \
    --name keventers-api \
    -i "$API_INSTANCES" \
    --wait-ready \
    --listen-timeout 20000
  pm2 start src/worker.js \
    --name keventers-worker \
    --wait-ready \
    --listen-timeout 20000
}

wait_until_ready() {
  local attempt
  for attempt in $(seq 1 20); do
    if curl --fail --silent --show-error --max-time 5 "$HEALTH_URL" >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

for command_name in git npm node pm2 curl flock tar; do
  require_command "$command_name"
done

mkdir -p "$APP_ROOT" "$RELEASES_DIR" "$SHARED_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log 'Another Keventers deployment is already running.'
  exit 1
fi

if [[ ! -d "$REPO_DIR/.git" ]]; then
  log "Cloning $REPO_URL"
  git clone --no-checkout "$REPO_URL" "$REPO_DIR"
else
  configured_origin="$(git -C "$REPO_DIR" remote get-url origin)"
  if [[ "$configured_origin" != "$REPO_URL" ]]; then
    log "Refusing to deploy: $REPO_DIR uses unexpected origin $configured_origin"
    exit 1
  fi
fi

log "Fetching origin/$DEPLOY_BRANCH"
git -C "$REPO_DIR" fetch --prune origin "$DEPLOY_BRANCH"
commit="$(git -C "$REPO_DIR" rev-parse "origin/$DEPLOY_BRANCH")"
release_id="$(date -u +%Y%m%d%H%M%S)-${commit:0:8}"
release="$RELEASES_DIR/$release_id"
previous_release="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

mkdir -p "$release"
git -C "$REPO_DIR" archive "$commit" backend | tar -x -C "$release" --strip-components=1

if [[ ! -f "$SHARED_DIR/.env" ]]; then
  if [[ -n "$previous_release" && -f "$previous_release/.env" ]]; then
    cp "$previous_release/.env" "$SHARED_DIR/.env"
    chmod 600 "$SHARED_DIR/.env"
  else
    log "Missing production environment file: $SHARED_DIR/.env"
    log "Create it once, then run this script again."
    exit 1
  fi
fi

mkdir -p "$SHARED_DIR/storage" "$SHARED_DIR/uploads"
if [[ -n "$previous_release" ]]; then
  if [[ -d "$previous_release/storage" && ! -L "$previous_release/storage" ]]; then
    cp -a "$previous_release/storage/." "$SHARED_DIR/storage/"
  fi
  if [[ -d "$previous_release/uploads" && ! -L "$previous_release/uploads" ]]; then
    cp -a "$previous_release/uploads/." "$SHARED_DIR/uploads/"
  fi
fi

rm -rf "$release/storage" "$release/uploads"
ln -s "$SHARED_DIR/.env" "$release/.env"
ln -s "$SHARED_DIR/storage" "$release/storage"
ln -s "$SHARED_DIR/uploads" "$release/uploads"

log "Installing production dependencies for $release_id"
cd "$release"
npm ci --omit=dev --ignore-scripts
npm rebuild bcrypt
node --input-type=module -e "import('./src/config/index.js')"

ln -sfn "$release" "$CURRENT_LINK"

log 'Restarting only Keventers PM2 processes'
if ! start_keventers "$release" || ! wait_until_ready; then
  log 'New release failed its readiness check.'
  if [[ -n "$previous_release" && -d "$previous_release" ]]; then
    log "Rolling back to $previous_release"
    ln -sfn "$previous_release" "$CURRENT_LINK"
    start_keventers "$previous_release"
    wait_until_ready || log 'Rollback started, but readiness still failed.'
    pm2 save
  fi
  exit 1
fi

pm2 save
log "Deployment complete: $release_id"
log "Commit: $commit"
curl --fail --silent --show-error "$HEALTH_URL"
printf '\n'
