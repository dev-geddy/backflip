#!/usr/bin/env bash
# @spec L2-DEVOPS-15
# pm2 entrypoint for the Next standalone server. Loads the droplet env, then
# execs node so pm2 supervises the server process itself (no bash wrapper pid).
set -euo pipefail

set -a
source /opt/backflip/.env
source /opt/backflip/.env.local
set +a

export NODE_ENV=production PORT=3070 HOSTNAME=127.0.0.1   # loopback only — Caddy fronts it

exec node /opt/backflip/.releases/current/apps/web/server.js
