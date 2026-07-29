#!/usr/bin/env bash
# @spec L2-DEVOPS-15
# Remote fragment, runs as the app user: flip `current` to the inactive
# blue/green slot (the one artifact-extract.sh just filled) and restart pm2.
# Unlike slot-switch.sh (rollback) this tolerates a missing `current` — first
# deploy flips to blue — and it is the go-live moment of a build-locally deploy.
#
# Env: REMOTE_DIR, APP_NAME, APP_PORT, NEEDS_NVM (yes|no).
set -euo pipefail

: "${REMOTE_DIR:?REMOTE_DIR not set}"
: "${APP_NAME:?APP_NAME not set}"

cd "$REMOTE_DIR"   # sudo keeps the invoking cwd; an inaccessible cwd makes node spawns fail EACCES

if [ "${NEEDS_NVM:-no}" = "yes" ]; then
  # Non-interactive ssh gets no profile — put the nvm node (and its pm2) on PATH.
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] || { echo "nvm not found for $(id -un) — run setup-droplet-for-pm2.sh first" >&2; exit 1; }
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

# Same pure slot choice as artifact-extract.sh (nothing flipped `current` since).
ACTIVE=""
if [ -L current ]; then
  case "$(basename "$(readlink current)")" in
    blue)  ACTIVE="blue" ;;
    green) ACTIVE="green" ;;
  esac
fi
case "$ACTIVE" in
  blue)  TARGET="green" ;;
  green) TARGET="blue" ;;
  *)     TARGET="blue" ;;
esac

[ -f "$REMOTE_DIR/$TARGET/apps/web/server.js" ] \
  || { echo "slot $TARGET holds no release ($TARGET/apps/web/server.js missing) — extract the artifact first" >&2; exit 1; }

echo "--> switching current -> $TARGET"
ln -sfn "$TARGET" current

echo "--> pm2 restart ($APP_NAME only — other apps untouched)"
APP_DIR="$REMOTE_DIR" APP_PORT="${APP_PORT:-3070}" pm2 startOrRestart devops/pm2/ecosystem.config.cjs --only "$APP_NAME" && pm2 save
