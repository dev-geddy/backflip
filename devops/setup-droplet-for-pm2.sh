#!/usr/bin/env bash
# @spec L2-DEVOPS-01
# One-time droplet provisioning — pm2 flavor (no Docker). Idempotent — safe to re-run.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'USAGE'
Provision an empty Ubuntu droplet — pm2 flavor: packages, swap, security
hardening (ssh key-only, fail2ban, unattended-upgrades), nvm + Node 24 +
corepack (yarn 4), pm2, nginx reverse proxy + Let's Encrypt TLS, firewall,
app dirs. No Docker. Pairs with ./devops/deploy-for-pm2.sh.

Database is provisioned separately — run one of:
  ./devops/setup-droplet-db-native.sh   (Postgres 17 on the host)
  ./devops/setup-droplet-db-docker.sh   (Postgres in Docker)

Multi-instance: re-run with a different -n/-d/--app-port to host another
instance on the same droplet (own dir /opt/<name>, pm2 app, nginx site, cert).

Usage:
  ./devops/setup-droplet-for-pm2.sh -h <host> -i <path-to-ssh-key> -d <domain>
                                    [-m <certbot-email>] [-n <app-name>]
                                    [--app-port <port>] [-u user] [-p port]

  -h  droplet host or IP        (required)
  -i  ssh private key path      (required)
  -d  domain for nginx + TLS    (required; A record should point at the droplet)
  -m  email for Let's Encrypt   (recommended: expiry notices)
  -n  app/instance name         (default: backflip → /opt/backflip, pm2 app + nginx site "backflip")
  --app-port  app loopback port (default: 3070; must be unique per instance)
  -u  ssh user                  (default: root)
  -p  ssh port                  (default: 22)
USAGE
}

HOST=""
SSH_KEY=""
SSH_USER="root"
SSH_PORT="22"
DOMAIN=""
CERTBOT_EMAIL=""

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--host)      require_arg "$1" "${2:-}"; HOST="$2"; shift 2 ;;
    -i|--identity)  require_arg "$1" "${2:-}"; SSH_KEY="$2"; shift 2 ;;
    -d|--domain)    require_arg "$1" "${2:-}"; DOMAIN="$2"; shift 2 ;;
    -m|--email)     require_arg "$1" "${2:-}"; CERTBOT_EMAIL="$2"; shift 2 ;;
    -n|--app-name)  require_arg "$1" "${2:-}"; APP_NAME="$2"; shift 2 ;;
    --app-port)     require_arg "$1" "${2:-}"; APP_PORT="$2"; shift 2 ;;
    -u|--user)      require_arg "$1" "${2:-}"; SSH_USER="$2"; shift 2 ;;
    -p|--port)      require_arg "$1" "${2:-}"; SSH_PORT="$2"; shift 2 ;;
    --help)         usage; exit 0 ;;
    *)              die_usage "unknown argument: $1" ;;
  esac
done

[ -n "$HOST" ] || die_usage "-h <host> is required"
[ -n "$SSH_KEY" ] || die_usage "-i <path-to-ssh-key> is required"
[ -n "$DOMAIN" ] || die_usage "-d <domain> is required"
REMOTE_DIR="/opt/$APP_NAME"

NVM_VERSION="v0.40.3"

# --- preflight ---
require_file "$SSH_KEY" "ssh private key not found"
require_file "$SCRIPT_DIR/nginx/backflip.conf" "nginx site template missing"
log "checking ssh to $SSH_USER@$HOST:$SSH_PORT"
remote_run true >/dev/null 2>&1 || die "cannot ssh to $SSH_USER@$HOST:$SSH_PORT (check host, key, port)"
ok "ssh reachable"

# --- provision ---
# All remote vars are passed via env so the heredoc stays quoted (no \$ escaping).
log "provisioning droplet (pm2 flavor)"
remote_run "REMOTE_DIR='$REMOTE_DIR' NVM_VERSION='$NVM_VERSION' APP_USER='$APP_USER' bash -s" <<'REMOTE'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# Run as root; fall back to sudo for a non-root ssh user.
if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

echo "--> apt-get update"
$SUDO apt-get update -y

echo "--> base packages"
$SUDO apt-get install -y --no-install-recommends ca-certificates curl git ufw rsync gnupg

# Swap. Next builds run on the droplet and OOM on small ones without it.
if [ -z "$(swapon --show)" ]; then
  echo "--> creating 2G swapfile"
  $SUDO fallocate -l 2G /swapfile || $SUDO dd if=/dev/zero of=/swapfile bs=1M count=2048
  $SUDO chmod 600 /swapfile
  $SUDO mkswap /swapfile
  $SUDO swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' | $SUDO tee -a /etc/fstab >/dev/null
else
  echo "--> swap already active, skipping"
fi

# Dedicated app user: locked (no password, no ssh keys → no remote login),
# owns /opt/backflip and runs pm2 + the app. Root stays for system work only.
if id "$APP_USER" >/dev/null 2>&1; then
  echo "--> user $APP_USER exists, skipping"
else
  echo "--> creating app user $APP_USER"
  $SUDO useradd -m -s /bin/bash "$APP_USER"
fi
APP_HOME="$(getent passwd "$APP_USER" | cut -d: -f6)"

# nvm-managed Node, installed under the app user. pm2 + yarn ride the nvm node.
echo "--> nvm + node 24 + corepack + pm2 (as $APP_USER)"
sudo -H -u "$APP_USER" NVM_VERSION="$NVM_VERSION" bash -s <<'APPSETUP'
set -euo pipefail
cd "$HOME"   # sudo keeps the invoking cwd; an inaccessible cwd makes node spawns fail EACCES
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  echo "    nvm already installed, skipping"
else
  echo "    installing nvm $NVM_VERSION"
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh" | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

if nvm ls 24 >/dev/null 2>&1; then
  echo "    node 24 already installed via nvm, skipping"
else
  echo "    installing node 24 via nvm"
  nvm install 24
fi
nvm alias default 24 >/dev/null
nvm use default >/dev/null

echo "    corepack (yarn 4 via repo packageManager pin)"
corepack enable

if command -v pm2 >/dev/null 2>&1; then
  echo "    pm2 already installed, skipping"
else
  echo "    installing pm2"
  npm i -g pm2
fi
node -v; pm2 -v
APPSETUP

# Boot persistence: pm2-<app-user> systemd unit. Generated by root with the
# app user's nvm node bin on PATH, so the unit finds node without a profile.
NODE_BIN="$(sudo -H -u "$APP_USER" bash -c 'cd; . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 && dirname "$(command -v node)"')"
if systemctl list-unit-files | grep -q "pm2-$APP_USER"; then
  echo "--> pm2 startup unit present, skipping"
else
  echo "--> pm2 boot persistence (pm2-$APP_USER)"
  $SUDO env PATH="$NODE_BIN:$PATH" "$NODE_BIN/pm2" startup systemd -u "$APP_USER" --hp "$APP_HOME"
fi

echo "--> nginx + certbot"
$SUDO apt-get install -y nginx certbot python3-certbot-nginx
$SUDO systemctl enable --now nginx

echo "--> firewall"
$SUDO ufw allow OpenSSH
$SUDO ufw allow 80/tcp
$SUDO ufw allow 443/tcp
$SUDO ufw --force enable

# SSH hardening: key-only auth. Drop-in wins over sshd_config and cloud-init
# fragments (sshd_config.d is Include'd first). Validate before reload so a
# bad config never kills the running sshd (existing session survives anyway).
echo "--> ssh hardening (key-only auth)"
$SUDO tee /etc/ssh/sshd_config.d/99-backflip-hardening.conf >/dev/null <<'SSHD'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
X11Forwarding no
MaxAuthTries 4
SSHD
$SUDO sshd -t
$SUDO systemctl reload ssh

# fail2ban: ban IPs brute-forcing sshd. systemd backend — works without
# rsyslog/auth.log (minimal cloud images).
if command -v fail2ban-server >/dev/null 2>&1; then
  echo "--> fail2ban already installed, skipping"
else
  echo "--> installing fail2ban"
  $SUDO apt-get install -y fail2ban
fi
$SUDO tee /etc/fail2ban/jail.local >/dev/null <<'JAIL'
[sshd]
enabled = true
backend = systemd
maxretry = 5
bantime = 1h
findtime = 10m
JAIL
$SUDO systemctl enable --now fail2ban
$SUDO systemctl restart fail2ban

# Unattended security updates.
echo "--> unattended-upgrades"
$SUDO apt-get install -y unattended-upgrades
$SUDO tee /etc/apt/apt.conf.d/20auto-upgrades >/dev/null <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT
$SUDO systemctl enable --now unattended-upgrades

echo "--> app dirs $REMOTE_DIR (owned by $APP_USER)"
$SUDO mkdir -p "$REMOTE_DIR" "$REMOTE_DIR/.releases"
$SUDO chown -R "$APP_USER:$APP_USER" "$REMOTE_DIR"

echo "--> versions"
nginx -v
certbot --version
REMOTE

# --- nginx site (rendered locally from the template, pushed to the droplet) ---
# One site file per instance — other instances' sites are untouched.
log "nginx site $APP_NAME.conf for $DOMAIN (app port $APP_PORT)"
sed -e "s/__DOMAIN__/$DOMAIN/g" -e "s/__PORT__/$APP_PORT/g" "$SCRIPT_DIR/nginx/backflip.conf" \
  | remote_run "tee /etc/nginx/sites-available/$APP_NAME.conf >/dev/null"
remote_run "DOMAIN='$DOMAIN' CERTBOT_EMAIL='$CERTBOT_EMAIL' APP_NAME='$APP_NAME' bash -s" <<'REMOTE'
set -euo pipefail
if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

$SUDO ln -sfn "/etc/nginx/sites-available/$APP_NAME.conf" "/etc/nginx/sites-enabled/$APP_NAME.conf"
$SUDO rm -f /etc/nginx/sites-enabled/default
$SUDO nginx -t
$SUDO systemctl reload nginx
echo "--> nginx serving $DOMAIN on :80"

# TLS. Needs the domain's A record resolving to this droplet; if DNS isn't
# ready yet the setup still completes — re-run the printed command later.
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "--> certificate for $DOMAIN already present, skipping certbot"
elif [ -n "$CERTBOT_EMAIL" ]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect \
    || { echo "warn: certbot failed (DNS not pointing here yet?). Site stays on http."; \
         echo "      re-run when DNS is ready: certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $CERTBOT_EMAIL --redirect"; }
else
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
    || { echo "warn: certbot failed (DNS not pointing here yet?). Site stays on http."; \
         echo "      re-run when DNS is ready: certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email --redirect"; }
fi
REMOTE

ok "droplet provisioned (pm2 flavor)"

cat <<NEXT

Next steps:

  1. Provision the database (once):
       ./devops/setup-droplet-db-native.sh -h $HOST -i $SSH_KEY   # Postgres 17 on the host
     or
       ./devops/setup-droplet-db-docker.sh -h $HOST -i $SSH_KEY   # Postgres in Docker

  2. Create the two env files locally from the templates (both gitignored):
       cp devops/env/production.env.example       .env.production
       cp devops/env/production.env.local.example .env.production.local
     Then edit them — set a strong POSTGRES_PASSWORD, ENCRYPTION_KEY,
     AUTH_SECRET, DOMAIN=$DOMAIN and AUTH_URL.

  3. First deploy (uploads the env files to $REMOTE_DIR):
       ./devops/deploy-for-pm2.sh -h $HOST -i $SSH_KEY -n $APP_NAME --app-port $APP_PORT --env .env.production --env-local .env.production.local

     Later deploys omit --env/--env-local; droplet env is left untouched.

  4. Seed the platform owner once (see README) if this is a fresh database.
NEXT
