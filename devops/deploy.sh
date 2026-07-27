#!/usr/bin/env bash
# @spec L2-DEVOPS-02, L2-DEVOPS-07
# Deploy to the droplet. Runs the same way from a laptop or from CI —
# CI configs are thin wrappers around this script, never copies of it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'USAGE'
Deploy the app to a provisioned droplet: sync → build → migrate → up → health check.

Usage:
  ./devops/deploy.sh -h <host> -i <path-to-ssh-key> [-u user] [-p port]
                     [--env <file>] [--env-local <file>] [--skip-migrations]

  -h  droplet host or IP        (required)
  -i  ssh private key path      (required)
  -u  ssh user                  (default: root)
  -p  ssh port                  (default: 22)

  --env <file>        upload as /opt/backflip/.env       (first deploy only)
  --env-local <file>  upload as /opt/backflip/.env.local (first deploy only)
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

# --- preflight ---
require_file "$SSH_KEY" "ssh private key not found"
if [ -n "$ENV_FILE" ]; then require_file "$ENV_FILE" "--env file not found"; fi
if [ -n "$ENV_LOCAL_FILE" ]; then require_file "$ENV_LOCAL_FILE" "--env-local file not found"; fi

log "checking ssh to $SSH_USER@$HOST:$SSH_PORT"
remote_run true >/dev/null 2>&1 || die "cannot ssh to $SSH_USER@$HOST:$SSH_PORT (run setup-droplet.sh first?)"

remote_run "mkdir -p $REMOTE_DIR"

# --- env files (uploaded only when explicitly passed; never overwritten otherwise) ---
if [ -n "$ENV_FILE" ]; then
  log "uploading $ENV_FILE → $REMOTE_DIR/.env"
  remote_copy "$ENV_FILE" "$REMOTE_DIR/.env"
  remote_run "chmod 600 $REMOTE_DIR/.env"
fi
if [ -n "$ENV_LOCAL_FILE" ]; then
  log "uploading $ENV_LOCAL_FILE → $REMOTE_DIR/.env.local"
  remote_copy "$ENV_LOCAL_FILE" "$REMOTE_DIR/.env.local"
  remote_run "chmod 600 $REMOTE_DIR/.env.local"
fi

if ! remote_run "test -f $REMOTE_DIR/.env && test -f $REMOTE_DIR/.env.local"; then
  die "$REMOTE_DIR/.env and $REMOTE_DIR/.env.local must both exist on the droplet.
     Fill in devops/env/production.env.example and devops/env/production.env.local.example,
     then re-run with --env <file> --env-local <file>."
fi
ok "droplet env present"

# --- sync ---
sync_repo

# --- build, migrate, up ---
log "building + starting stack"
remote_run 'bash -s' <<REMOTE
set -euo pipefail
cd "$REMOTE_DIR"

# --project-directory . → all relative paths in the compose file resolve against
# $REMOTE_DIR, and compose reads $REMOTE_DIR/.env for interpolation.
DC="docker compose --project-directory . -f devops/compose.prod.yml"

echo "--> build app"
\$DC build app

echo "--> start db"
\$DC up -d db

echo "--> waiting for db health"
healthy="no"
for _ in \$(seq 1 30); do
  cid="\$(\$DC ps -q db)"
  if [ -n "\$cid" ] && [ "\$(docker inspect -f '{{.State.Health.Status}}' "\$cid" 2>/dev/null || echo starting)" = "healthy" ]; then
    healthy="yes"; break
  fi
  sleep 2
done
[ "\$healthy" = "yes" ] || { echo "db did not become healthy within 60s" >&2; \$DC logs --tail 50 db >&2; exit 1; }
echo "    db healthy"

if [ "$SKIP_MIGRATIONS" = "yes" ]; then
  echo "--> skipping migrations"
else
  echo "--> migrations"
  # --no-deps: db is already up. DATABASE_URL comes from the compose service
  # env (db:5432), overriding the env_file value.
  \$DC run --rm --no-deps app corepack yarn db:migrate
fi

echo "--> up"
\$DC up -d

echo "--> pruning dangling images"
docker image prune -f >/dev/null
REMOTE

ok "stack up"

# --- health check ---
log "health check"
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

# Any HTTP response means the stack is serving. Caddy answers :80 with a 308 to
# https, so 3xx/4xx are expected — only "no response at all" is a failure.
case "$CODE" in
  000) die "no HTTP response on port 80. Check: docker compose --project-directory . -f devops/compose.prod.yml logs" ;;
  2*)  ok "http $CODE" ;;
  *)   warn "http $CODE (expected — Caddy redirects :80 to https); stack is responding" ;;
esac

cat <<DONE

$(ok "deploy complete")

  host       $SSH_USER@$HOST
  dir        $REMOTE_DIR
  migrations $([ "$SKIP_MIGRATIONS" = "yes" ] && echo skipped || echo applied)

  Logs:    ssh -i $SSH_KEY -p $SSH_PORT $SSH_USER@$HOST 'cd $REMOTE_DIR && docker compose --project-directory . -f devops/compose.prod.yml logs -f'
  Status:  ssh -i $SSH_KEY -p $SSH_PORT $SSH_USER@$HOST 'cd $REMOTE_DIR && docker compose --project-directory . -f devops/compose.prod.yml ps'

  Site is on https://<your DOMAIN> once DNS resolves to this droplet.
DONE
