# @spec L2-DEVOPS-03
# Shared helpers for the devops scripts. Source it, don't execute it.
# Callers set: HOST (required), SSH_KEY (required), SSH_USER (default root), SSH_PORT (default 22).

# Colors only on a tty.
if [ -t 1 ]; then
  _C_RESET=$'\033[0m'; _C_DIM=$'\033[2m'; _C_RED=$'\033[31m'
  _C_GREEN=$'\033[32m'; _C_YELLOW=$'\033[33m'; _C_BLUE=$'\033[34m'
else
  _C_RESET=''; _C_DIM=''; _C_RED=''; _C_GREEN=''; _C_YELLOW=''; _C_BLUE=''
fi

log()  { printf '%s==>%s %s\n' "$_C_BLUE" "$_C_RESET" "$*"; }
ok()   { printf '%s ok %s %s\n' "$_C_GREEN" "$_C_RESET" "$*"; }
warn() { printf '%swarn%s %s\n' "$_C_YELLOW" "$_C_RESET" "$*" >&2; }
note() { printf '%s%s%s\n' "$_C_DIM" "$*" "$_C_RESET"; }
die()  { printf '%sfail%s %s\n' "$_C_RED" "$_C_RESET" "$*" >&2; exit 1; }

# require_file <path> [hint] — die unless the file exists.
require_file() {
  [ -f "$1" ] || die "missing file: $1${2:+ — $2}"
}

# usage support. Callers define usage(); these print it on bad input.
# die_usage <msg>
die_usage() {
  printf '%sfail%s %s\n\n' "$_C_RED" "$_C_RESET" "$*" >&2
  usage >&2
  exit 1
}

# require_arg <flag> <value> — die unless the flag got a non-empty value.
require_arg() {
  [ -n "${2:-}" ] || die_usage "$1 requires a value"
}

# Paths. REPO_ROOT = two levels up from this file (devops/lib → repo root).
_COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${REPO_ROOT:-$(cd "$_COMMON_DIR/../.." && pwd)}"
REMOTE_DIR="${REMOTE_DIR:-/opt/backflip}"

SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new)

# Validate + default the connection vars. Called by every remote helper.
_ssh_ready() {
  : "${HOST:?HOST not set}"
  : "${SSH_KEY:?SSH_KEY not set}"
  SSH_USER="${SSH_USER:-root}"
  SSH_PORT="${SSH_PORT:-22}"
}

# remote_run "<cmd>" — run a command on the droplet. Stdin is forwarded, so
# `remote_run 'bash -s' <<'EOF' … EOF` works for multi-line remote scripts.
remote_run() {
  _ssh_ready
  ssh -i "$SSH_KEY" -p "$SSH_PORT" "${SSH_OPTS[@]}" "$SSH_USER@$HOST" "$@"
}

# remote_copy <local> <remote> — copy a single file to the droplet.
remote_copy() {
  _ssh_ready
  scp -i "$SSH_KEY" -P "$SSH_PORT" "${SSH_OPTS[@]}" "$1" "$SSH_USER@$HOST:$2"
}

# sync_repo — mirror the repo root to $REMOTE_DIR. --delete, so the droplet
# copy tracks the working tree exactly; env files and build output are excluded
# (secrets live only on the droplet, artifacts are rebuilt there).
# Excluded paths are also protected from --delete, so the droplet's own .env,
# .env.local and .env.init survive every sync. The `*.pem` / `env*.deploy`
# excludes keep CI-written keys and env payloads off the droplet, and
# `.releases` keeps the live release (served by pm2) out of rsync's reach.
# Note: SSH_KEY paths with spaces aren't supported (rsync splits -e on spaces).
sync_repo() {
  _ssh_ready
  log "syncing $REPO_ROOT → $SSH_USER@$HOST:$REMOTE_DIR"
  rsync -az --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.turbo' \
    --exclude '.releases' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '.env.init' \
    --exclude '.env.*' \
    --exclude '*.pem' \
    --exclude 'env.deploy' \
    --exclude 'env.local.deploy' \
    -e "ssh -i $SSH_KEY -p $SSH_PORT -o BatchMode=yes -o StrictHostKeyChecking=accept-new" \
    "$REPO_ROOT/" "$SSH_USER@$HOST:$REMOTE_DIR/"
}
