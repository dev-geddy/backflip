#!/usr/bin/env bash
# @spec L2-DEVOPS-01
# One-time droplet provisioning. Idempotent — safe to re-run.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'USAGE'
Provision an empty Ubuntu droplet — docker flavor: packages, swap, Docker
(db only), Node 24 + pm2 (app runtime), native Caddy, firewall, security
hardening (ssh key-only, fail2ban, unattended-upgrades), app dirs.
Pairs with ./devops/deploy-for-docker.sh.

Usage:
  ./devops/setup-droplet-for-docker.sh -h <host> -i <path-to-ssh-key> -d <domain> [-u user] [-p port]

  -h  droplet host or IP        (required)
  -i  ssh private key path      (required)
  -d  domain of this instance   (required — keys the deploy dir /var/www/<domain>)
  -u  ssh user                  (default: root)
  -p  ssh port                  (default: 22)
USAGE
}

HOST=""
SSH_KEY=""
SSH_USER="root"
SSH_PORT="22"
DOMAIN=""

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--host)      require_arg "$1" "${2:-}"; HOST="$2"; shift 2 ;;
    -i|--identity)  require_arg "$1" "${2:-}"; SSH_KEY="$2"; shift 2 ;;
    -d|--domain)    require_arg "$1" "${2:-}"; DOMAIN="$2"; shift 2 ;;
    -u|--user)      require_arg "$1" "${2:-}"; SSH_USER="$2"; shift 2 ;;
    -p|--port)      require_arg "$1" "${2:-}"; SSH_PORT="$2"; shift 2 ;;
    --help)         usage; exit 0 ;;
    *)              die_usage "unknown argument: $1" ;;
  esac
done

[ -n "$HOST" ] || die_usage "-h <host> is required"
[ -n "$SSH_KEY" ] || die_usage "-i <path-to-ssh-key> is required"
[ -n "$DOMAIN" ] || die_usage "-d <domain> is required"
REMOTE_DIR="/var/www/$DOMAIN"

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
\$SUDO apt-get install -y --no-install-recommends ca-certificates curl git ufw rsync gnupg

# Swap. Next builds run on the droplet and OOM on small ones without it.
if [ -z "\$(swapon --show)" ]; then
  echo "--> creating 2G swapfile"
  \$SUDO fallocate -l 2G /swapfile || \$SUDO dd if=/dev/zero of=/swapfile bs=1M count=2048
  \$SUDO chmod 600 /swapfile
  \$SUDO mkswap /swapfile
  \$SUDO swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' | \$SUDO tee -a /etc/fstab >/dev/null
else
  echo "--> swap already active, skipping"
fi

# Dedicated app user: locked (no password, no ssh keys → no remote login),
# owns /var/www/<domain> and runs pm2 + the app. Root stays for system work only.
if id "$APP_USER" >/dev/null 2>&1; then
  echo "--> user $APP_USER exists, skipping"
else
  echo "--> creating app user $APP_USER"
  \$SUDO useradd -m -s /bin/bash "$APP_USER"
fi

# Docker runs the database only; the app itself runs on the host under pm2.
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

node_major=0
if command -v node >/dev/null 2>&1; then
  node_major="\$(node -v | sed 's/^v//' | cut -d. -f1)"
fi
if [ "\$node_major" -lt 24 ]; then
  echo "--> installing node 24"
  curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
  \$SUDO bash /tmp/nodesource_setup.sh
  rm -f /tmp/nodesource_setup.sh
  \$SUDO apt-get install -y nodejs
else
  echo "--> node \$(node -v) already installed, skipping"
fi
\$SUDO corepack enable

if command -v pm2 >/dev/null 2>&1; then
  echo "--> pm2 already installed, skipping"
else
  echo "--> installing pm2"
  \$SUDO npm i -g pm2
fi

# Boot persistence: pm2-<app-user> systemd unit. Node is system-wide (apt),
# so the unit's PATH needs no nvm handling here.
APP_HOME="\$(getent passwd "$APP_USER" | cut -d: -f6)"
if systemctl list-unit-files | grep -q "pm2-$APP_USER"; then
  echo "--> pm2 startup unit present, skipping"
else
  echo "--> pm2 boot persistence (pm2-$APP_USER)"
  \$SUDO env PATH="\$PATH" pm2 startup systemd -u "$APP_USER" --hp "\$APP_HOME"
fi

# Caddy runs natively (systemd), fronting the pm2 app on 127.0.0.1:3070.
if command -v caddy >/dev/null 2>&1; then
  echo "--> caddy already installed, skipping"
else
  echo "--> installing caddy (official apt repo)"
  \$SUDO apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor | \$SUDO tee /usr/share/keyrings/caddy-stable-archive-keyring.gpg >/dev/null
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | \$SUDO tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  \$SUDO apt-get update -y
  \$SUDO apt-get install -y caddy
fi

echo "--> firewall"
\$SUDO ufw allow OpenSSH
\$SUDO ufw allow 80/tcp
\$SUDO ufw allow 443/tcp
\$SUDO ufw allow 443/udp   # HTTP/3
\$SUDO ufw --force enable

# SSH hardening: key-only auth. Drop-in wins over sshd_config and cloud-init
# fragments (sshd_config.d is Include'd first). Validate before reload so a
# bad config never kills the running sshd (existing session survives anyway).
echo "--> ssh hardening (key-only auth)"
\$SUDO tee /etc/ssh/sshd_config.d/99-backflip-hardening.conf >/dev/null <<'SSHD'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
X11Forwarding no
MaxAuthTries 4
SSHD
\$SUDO sshd -t
\$SUDO systemctl reload ssh

# fail2ban: ban IPs brute-forcing sshd. systemd backend — works without
# rsyslog/auth.log (minimal cloud images).
if command -v fail2ban-server >/dev/null 2>&1; then
  echo "--> fail2ban already installed, skipping"
else
  echo "--> installing fail2ban"
  \$SUDO apt-get install -y fail2ban
fi
\$SUDO tee /etc/fail2ban/jail.local >/dev/null <<'JAIL'
[sshd]
enabled = true
backend = systemd
maxretry = 5
bantime = 1h
findtime = 10m
JAIL
\$SUDO systemctl enable --now fail2ban
\$SUDO systemctl restart fail2ban

# Unattended security updates.
echo "--> unattended-upgrades"
\$SUDO apt-get install -y unattended-upgrades
\$SUDO tee /etc/apt/apt.conf.d/20auto-upgrades >/dev/null <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT
\$SUDO systemctl enable --now unattended-upgrades

echo "--> app dirs $REMOTE_DIR (owned by $APP_USER)"
\$SUDO mkdir -p "$REMOTE_DIR" "$REMOTE_DIR/releases"
\$SUDO chown -R "$APP_USER:$APP_USER" "$REMOTE_DIR"

echo "--> versions"
docker --version
node -v
pm2 -v
caddy version
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
       ./devops/deploy-for-docker.sh -h $HOST -i $SSH_KEY -d $DOMAIN --env .env.production --env-local .env.production.local

     Later deploys omit --env/--env-local; droplet env is left untouched.

  4. Seed the platform owner once (see README) if this is a fresh database.
NEXT
