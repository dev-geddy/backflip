#!/usr/bin/env bash
# @spec L2-DEVOPS-01
# One-time droplet provisioning. Idempotent — safe to re-run.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'USAGE'
Provision an empty Ubuntu droplet: packages, Docker, firewall, app dir.

Usage:
  ./devops/setup-droplet.sh -h <host> -i <path-to-ssh-key> [-u user] [-p port]

  -h  droplet host or IP        (required)
  -i  ssh private key path      (required)
  -u  ssh user                  (default: root)
  -p  ssh port                  (default: 22)
USAGE
}

HOST=""
SSH_KEY=""
SSH_USER="root"
SSH_PORT="22"

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--host)      require_arg "$1" "${2:-}"; HOST="$2"; shift 2 ;;
    -i|--identity)  require_arg "$1" "${2:-}"; SSH_KEY="$2"; shift 2 ;;
    -u|--user)      require_arg "$1" "${2:-}"; SSH_USER="$2"; shift 2 ;;
    -p|--port)      require_arg "$1" "${2:-}"; SSH_PORT="$2"; shift 2 ;;
    --help)         usage; exit 0 ;;
    *)              die_usage "unknown argument: $1" ;;
  esac
done

[ -n "$HOST" ] || die_usage "-h <host> is required"
[ -n "$SSH_KEY" ] || die_usage "-i <path-to-ssh-key> is required"

# --- preflight ---
require_file "$SSH_KEY" "ssh private key not found"
log "checking ssh to $SSH_USER@$HOST:$SSH_PORT"
remote_run true >/dev/null 2>&1 || die "cannot ssh to $SSH_USER@$HOST:$SSH_PORT (check host, key, port)"
ok "ssh reachable"

# --- provision ---
log "provisioning droplet"
remote_run 'bash -s' <<REMOTE
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# Run as root; fall back to sudo for a non-root ssh user.
if [ "\$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

echo "--> apt-get update"
\$SUDO apt-get update -y

echo "--> base packages"
\$SUDO apt-get install -y --no-install-recommends ca-certificates curl git ufw rsync

if command -v docker >/dev/null 2>&1; then
  echo "--> docker already installed, skipping"
else
  echo "--> installing docker engine + compose plugin"
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  \$SUDO sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "--> installing compose plugin"
  \$SUDO apt-get install -y docker-compose-plugin
fi

echo "--> enabling docker"
\$SUDO systemctl enable --now docker

echo "--> firewall"
\$SUDO ufw allow OpenSSH
\$SUDO ufw allow 80/tcp
\$SUDO ufw allow 443/tcp
\$SUDO ufw allow 443/udp   # HTTP/3
\$SUDO ufw --force enable

echo "--> app dir $REMOTE_DIR"
\$SUDO mkdir -p "$REMOTE_DIR"
if [ -n "\$SUDO" ]; then \$SUDO chown "\$(id -u):\$(id -g)" "$REMOTE_DIR"; fi

echo "--> versions"
docker --version
docker compose version
REMOTE

ok "droplet provisioned"

cat <<NEXT

Next steps:

  1. Point a DNS A record at this droplet (needed for Caddy's TLS cert).

  2. Create the two env files locally from the templates (both gitignored):
       cp devops/env/production.env.example       .env.production
       cp devops/env/production.env.local.example .env.production.local
     Then edit them — set a strong POSTGRES_PASSWORD, ENCRYPTION_KEY,
     AUTH_SECRET, your DOMAIN and AUTH_URL.

  3. First deploy (uploads the env files to $REMOTE_DIR):
       ./devops/deploy.sh -h $HOST -i $SSH_KEY --env .env.production --env-local .env.production.local

     Later deploys omit --env/--env-local; droplet env is left untouched.

  4. Seed the platform owner once (see README) if this is a fresh database.
NEXT
