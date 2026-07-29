#!/usr/bin/env bash
# @spec L2-DEVOPS-02, L2-DEVOPS-07, L2-DEVOPS-15
# Deploy to a pm2-flavor droplet (setup-droplet-for-pm2.sh — nvm node, nginx).
# Runs the same way from a laptop or from CI — CI configs are thin wrappers
# around this script, never copies of it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'USAGE'
Deploy the app to a pm2-flavor droplet (setup-droplet-for-pm2.sh):
sync → install → build → migrate → release → pm2 restart → health check.
nginx + TLS are owned by setup; deploy does not touch them.
The database must be provisioned (setup-droplet-db-native.sh or
setup-droplet-db-docker.sh) — native postgres is used when its service is
active, the docker compose db otherwise.

Multi-instance safe: pm2 startOrRestart touches only this instance's app
(-n name); other apps under the shared pm2 daemon keep running.

Usage:
  ./devops/deploy-for-pm2.sh -h <host> -i <path-to-ssh-key> [-n <app-name>]
                             [--app-port <port>] [-u user] [-p port]
                             [--env <file>] [--env-local <file>] [--skip-migrations]

  -h  droplet host or IP        (required)
  -i  ssh private key path      (required)
  -n  app/instance name         (default: backflip — must match setup -n)
  --app-port  app loopback port (default: 3070 — must match setup --app-port)
  -u  ssh user                  (default: root)
  -p  ssh port                  (default: 22)

  --env <file>        upload as /opt/<app-name>/.env       (first deploy only)
  --env-local <file>  upload as /opt/<app-name>/.env.local (first deploy only)
  --skip-migrations   don't run drizzle migrations

Templates for the env files: devops/env/production.env{,.local}.example
USAGE
}

HOST=""
SSH_KEY=""
SSH_USER="root"
SSH_PORT="22"
ENV_FILE=""
ENV_LOCAL_FILE=""
SKIP_MIGRATIONS="no"

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--host)         require_arg "$1" "${2:-}"; HOST="$2"; shift 2 ;;
    -i|--identity)     require_arg "$1" "${2:-}"; SSH_KEY="$2"; shift 2 ;;
    -n|--app-name)     require_arg "$1" "${2:-}"; APP_NAME="$2"; shift 2 ;;
    --app-port)        require_arg "$1" "${2:-}"; APP_PORT="$2"; shift 2 ;;
    -u|--user)         require_arg "$1" "${2:-}"; SSH_USER="$2"; shift 2 ;;
    -p|--port)         require_arg "$1" "${2:-}"; SSH_PORT="$2"; shift 2 ;;
    --env)             require_arg "$1" "${2:-}"; ENV_FILE="$2"; shift 2 ;;
    --env-local)       require_arg "$1" "${2:-}"; ENV_LOCAL_FILE="$2"; shift 2 ;;
    --skip-migrations) SKIP_MIGRATIONS="yes"; shift ;;
    --help)            usage; exit 0 ;;
    *)                 die_usage "unknown argument: $1" ;;
  esac
done

[ -n "$HOST" ] || die_usage "-h <host> is required"
[ -n "$SSH_KEY" ] || die_usage "-i <path-to-ssh-key> is required"
REMOTE_DIR="/opt/$APP_NAME"

# --- preflight ---
require_file "$SSH_KEY" "ssh private key not found"
if [ -n "$ENV_FILE" ]; then require_file "$ENV_FILE" "--env file not found"; fi
if [ -n "$ENV_LOCAL_FILE" ]; then require_file "$ENV_LOCAL_FILE" "--env-local file not found"; fi

log "checking ssh to $SSH_USER@$HOST:$SSH_PORT"
remote_run true >/dev/null 2>&1 || die "cannot ssh to $SSH_USER@$HOST:$SSH_PORT (run setup-droplet-for-pm2.sh first?)"

remote_run "mkdir -p $REMOTE_DIR"

# --- env files (uploaded only when explicitly passed; never overwritten otherwise) ---
if [ -n "$ENV_FILE" ]; then
  log "uploading $ENV_FILE → $REMOTE_DIR/.env"
  remote_copy "$ENV_FILE" "$REMOTE_DIR/.env"
  remote_run "chmod 600 $REMOTE_DIR/.env && chown $APP_USER:$APP_USER $REMOTE_DIR/.env"
fi
if [ -n "$ENV_LOCAL_FILE" ]; then
  log "uploading $ENV_LOCAL_FILE → $REMOTE_DIR/.env.local"
  remote_copy "$ENV_LOCAL_FILE" "$REMOTE_DIR/.env.local"
  remote_run "chmod 600 $REMOTE_DIR/.env.local && chown $APP_USER:$APP_USER $REMOTE_DIR/.env.local"
fi

if ! remote_run "test -f $REMOTE_DIR/.env && test -f $REMOTE_DIR/.env.local"; then
  die "$REMOTE_DIR/.env and $REMOTE_DIR/.env.local must both exist on the droplet.
     Fill in devops/env/production.env.example and devops/env/production.env.local.example,
     then re-run with --env <file> --env-local <file>."
fi
ok "droplet env present"

# --- preflight typecheck (local, multi-core) ---
# The droplet build skips the TypeScript pass (NEXT_SKIP_TYPECHECK=1) — it costs
# ~60s on a 1-vCPU droplet. Check here instead, where it's fast. Skipped when
# deps aren't installed (e.g. thin CI wrappers) — CI should typecheck separately.
if [ -d "$REPO_ROOT/node_modules" ]; then
  log "typecheck (local)"
  (cd "$REPO_ROOT" && corepack yarn workspace web typecheck) || die "typecheck failed — fix before deploying"
  ok "typecheck clean"
else
  warn "node_modules missing locally — skipping preflight typecheck (droplet build skips it too)"
fi

# --- sync ---
sync_repo

# --- database (root: system services) ---
log "checking database"
remote_run "REMOTE_DIR='$REMOTE_DIR' bash -s" <<'REMOTE'
set -euo pipefail
cd "$REMOTE_DIR"
PG_PORT="$(grep '^POSTGRES_PORT=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)"
PG_PORT="${PG_PORT:-5432}"
if systemctl is-active --quiet postgresql; then
  # Native flavor (setup-droplet-db-native.sh).
  echo "--> native postgres active"
  pg_isready -h 127.0.0.1 -p "$PG_PORT" -t 30 || { echo "postgres not accepting connections on 127.0.0.1:$PG_PORT" >&2; exit 1; }
elif command -v docker >/dev/null 2>&1; then
  # Docker flavor (setup-droplet-db-docker.sh). --project-directory . → paths +
  # env interpolation resolve against $REMOTE_DIR.
  DC="docker compose --project-directory . -f devops/compose.prod.yml"
  echo "--> docker db"
  $DC up -d db
  healthy="no"
  for _ in $(seq 1 30); do
    cid="$($DC ps -q db)"
    if [ -n "$cid" ] && [ "$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo starting)" = "healthy" ]; then
      healthy="yes"; break
    fi
    sleep 2
  done
  [ "$healthy" = "yes" ] || { echo "db did not become healthy within 60s" >&2; $DC logs --tail 50 db >&2; exit 1; }
  echo "    db healthy"
else
  echo "no database found: neither the postgresql service is active nor docker is installed." >&2
  echo "run setup-droplet-db-native.sh or setup-droplet-db-docker.sh first." >&2
  exit 1
fi
REMOTE
ok "database ready"

# --- install, build, migrate, release (app user: everything pm2/app-side) ---
# Failure isolation: the live app serves from .releases/current via pm2, and
# nothing below touches it until the symlink switch. Deps, build and migrations
# all run against the synced working tree, so any failure up to that point
# leaves the previous release running untouched.
log "building + releasing (as $APP_USER)"
remote_run "sudo -H -u $APP_USER REMOTE_DIR='$REMOTE_DIR' SKIP_MIGRATIONS='$SKIP_MIGRATIONS' APP_NAME='$APP_NAME' APP_PORT='$APP_PORT' bash -s" <<'REMOTE'
set -euo pipefail
cd "$REMOTE_DIR"

# Non-interactive ssh gets no profile — put the nvm node (and its pm2, yarn)
# on PATH explicitly.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] || { echo "nvm not found for $(id -un) — run setup-droplet-for-pm2.sh first" >&2; exit 1; }
. "$NVM_DIR/nvm.sh"

echo "--> install deps"
# Full install (not --production): the build and drizzle-kit need devDeps.
corepack yarn install --immutable

echo "--> build app"
# Build before migrating: a build failure aborts before the schema moves, and
# the old-app-on-new-schema window stays as short as possible.
# NEXT_SKIP_TYPECHECK: types already checked in the deploy preflight (local).
NEXT_SKIP_TYPECHECK=1 corepack yarn workspace web build

if [ "$SKIP_MIGRATIONS" = "yes" ]; then
  echo "--> skipping migrations"
else
  echo "--> migrations"
  # Runs on the host. packages/db/src/load-env.ts reads $REMOTE_DIR/.env, whose
  # DATABASE_URL points at the loopback postgres port.
  corepack yarn db:migrate
fi

echo "--> assembling release"
# The standalone bundle mirrors the monorepo, so copying it wholesale gives
# .releases/<ts>/apps/web/server.js + a minimal node_modules at the root.
# Static assets and public/ are not traced into it and must be copied in.
rel="$REMOTE_DIR/.releases/$(date -u +%Y%m%d%H%M%S)"
mkdir -p "$rel"
cp -a apps/web/.next/standalone/. "$rel"/
mkdir -p "$rel/apps/web/.next"
cp -a apps/web/.next/static "$rel/apps/web/.next/static"
if [ -d apps/web/public ]; then cp -a apps/web/public "$rel/apps/web/public"; fi

echo "--> switching current -> $(basename "$rel")"
ln -sfn "$rel" "$REMOTE_DIR/.releases/current"

echo "--> pm2 restart ($APP_NAME only — other apps untouched)"
APP_DIR="$REMOTE_DIR" pm2 startOrRestart devops/pm2/ecosystem.config.cjs --only "$APP_NAME" && pm2 save

echo "--> pruning old releases (keep 3)"
stale="$(ls -1 "$REMOTE_DIR/.releases" | grep -v '^current$' | sort | head -n -3 || true)"
for old in $stale; do rm -rf "$REMOTE_DIR/.releases/$old"; done
REMOTE

ok "release live"

# --- health check ---
log "health check"
PM2_STATUS="$(remote_run "sudo -H -u $APP_USER APP_NAME='$APP_NAME' bash -s" <<'REMOTE'
set -uo pipefail
cd "$HOME"   # sudo keeps the invoking cwd; an inaccessible cwd makes node spawns fail EACCES
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
pm2 jlist 2>/dev/null | node -e "
let raw = ''
process.stdin.on('data', (d) => (raw += d)).on('end', () => {
  const app = JSON.parse(raw || '[]').find((a) => a.name === process.env.APP_NAME)
  process.stdout.write(app ? String(app.pm2_env.status) : 'missing')
})
"
REMOTE
)"

if [ "$PM2_STATUS" != "online" ]; then
  warn "pm2 reports $APP_NAME status: ${PM2_STATUS:-unknown}"
  remote_run "sudo -H -u $APP_USER bash -c 'cd; . \"\$HOME/.nvm/nvm.sh\"; pm2 logs $APP_NAME --lines 30 --nostream'" || true
  die "app process is not online"
fi
ok "pm2 online"

CODE="$(remote_run 'bash -s' <<'REMOTE'
set -uo pipefail
code="000"
for _ in $(seq 1 8); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:80 || echo 000)"
  [ "$code" != "000" ] && break
  sleep 3
done
printf '%s' "$code"
REMOTE
)"

# Any HTTP response means the stack is serving. With TLS issued, nginx answers
# :80 with a 301 to https — only "no response at all" is a failure.
case "$CODE" in
  000) die "no HTTP response on port 80. Check: pm2 logs backflip / systemctl status nginx" ;;
  2*)  ok "http $CODE" ;;
  *)   warn "http $CODE (expected — nginx redirects :80 to https once TLS is issued); stack is responding" ;;
esac

cat <<DONE

$(ok "deploy complete")

  host       $SSH_USER@$HOST
  dir        $REMOTE_DIR
  migrations $([ "$SKIP_MIGRATIONS" = "yes" ] && echo skipped || echo applied)

  Logs:    ssh -i $SSH_KEY -p $SSH_PORT $SSH_USER@$HOST "sudo -H -u $APP_USER bash -c 'cd; . \\\$HOME/.nvm/nvm.sh; pm2 logs $APP_NAME'"
  Status:  ssh -i $SSH_KEY -p $SSH_PORT $SSH_USER@$HOST "sudo -H -u $APP_USER bash -c 'cd; . \\\$HOME/.nvm/nvm.sh; pm2 status'; systemctl status nginx --no-pager | head -5"

  Site is on https://<your DOMAIN> once DNS resolves to this droplet.
DONE
