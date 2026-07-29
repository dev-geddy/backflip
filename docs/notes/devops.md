# Notes (L3) — devops

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
Two droplet flavors: **pm2** (preferred — nvm node, nginx+certbot, db native or docker) and **docker** (apt node, Caddy, docker db). Setup + deploy come in matching pairs.
Multi-instance: several instances can share one droplet. Identity = `APP_NAME` (default `backflip`) + `APP_PORT` (default 3070), flags `-n/--app-name`, `--app-port` on setup-for-pm2 + both deploys. Derives: `/opt/<name>` dir, pm2 process name, nginx site `<name>.conf`, loopback port. `pm2 startOrRestart --only <name>` + name-scoped health check → other apps untouched; one shared pm2 daemon (user `backflip`) supervises all. `devops/pm2/ecosystem.config.cjs` + `start.sh` are env-driven (`APP_NAME`/`APP_DIR`/`APP_PORT`). Docker flavor caveat: Caddyfile render is global single-site — multi-instance is a pm2-flavor feature.
Privilege model (both flavors): locked `backflip` app user (`APP_USER` in `lib/common.sh`; useradd -m, no password/ssh) owns `/opt/backflip` and runs pm2 + app (`pm2-backflip` systemd unit). Root does system work only (packages, db service/compose, nginx/Caddy, ufw). Deploy: rsync as root with `--chown backflip:backflip`; app phase via `sudo -H -u backflip`; env files chowned on upload. pm2 flavor: nvm lives in `/home/backflip/.nvm`; remote app steps source it (non-interactive ssh has no profile); `pm2 startup` run by root with nvm bin on PATH so the unit finds node.
- `devops/setup-droplet-for-pm2.sh` — one-time provision, pm2 flavor. Flags `-h -i -d <domain> [-m <certbot-email>] [-u -p]`. apt base pkgs, 2G swap (if none — Next build OOM guard), nvm v0.40.3 → node 24 (`nvm alias default 24`) + corepack (yarn 4 via repo `packageManager` pin), pm2 (npm -g under nvm; systemd startup unit generated with nvm bin on PATH), nginx + certbot, ufw (OpenSSH/80/443 tcp), hardening (shared block, see below), app dirs. nginx site rendered locally from `devops/nginx/backflip.conf` (`__DOMAIN__`) → pushed to `/etc/nginx/sites-available/backflip.conf`, default site removed, `nginx -t` before reload. certbot: skipped if cert dir exists; `-m` email or `--register-unsafely-without-email`; failure (DNS not ready) = warn + continue, prints re-run command. No Docker. Satisfies `L2-DEVOPS-01`.
- `devops/setup-droplet-for-docker.sh` — one-time provision, docker flavor (former `setup-droplet.sh`): Docker via get.docker.com (db only), Node 24 (NodeSource) + corepack, pm2, native Caddy (official apt repo), ufw (OpenSSH/80/443 tcp+udp), same hardening block, app dirs. Satisfies `L2-DEVOPS-01`.
  - Hardening (both flavors): sshd drop-in `/etc/ssh/sshd_config.d/99-backflip-hardening.conf` (PasswordAuthentication no, KbdInteractiveAuthentication no, PermitRootLogin prohibit-password, X11Forwarding no, MaxAuthTries 4; `sshd -t` before `systemctl reload ssh`); fail2ban sshd jail via `/etc/fail2ban/jail.local` (`backend = systemd` — no rsyslog/auth.log dependency on minimal images; maxretry 5, bantime 1h, findtime 10m); unattended-upgrades via `/etc/apt/apt.conf.d/20auto-upgrades`.
- `devops/setup-droplet-db-native.sh` — db provision, native: PGDG apt repo → postgresql-17 (parity with compose/local 17), loopback-only assert, idempotent role+db create (`--db-name`/`--db-user` default `backflip`, `--db-password` generated + printed once if omitted; existing role's password never overwritten), prints `DATABASE_URL`. Satisfies `L2-DEVOPS-01`.
- `devops/setup-droplet-db-docker.sh` — db provision, docker: Docker engine + compose plugin only; db container starts on first deploy (needs droplet `.env`). Satisfies `L2-DEVOPS-01`.
- `devops/deploy-for-docker.sh` — deploy, docker flavor (former `deploy.sh`). Flags `-h -i [-u -p] [--env] [--env-local] [--skip-migrations]`. Flow: preflight ssh → optional env upload (0600) → verify droplet env → `sync_repo` → remote: `yarn install --immutable`, db up + health wait (60s), `yarn workspace web build`, `yarn db:migrate` (host → loopback db), copy standalone bundle → `/opt/backflip/.releases/<utc-ts>`, flip `current` symlink, `pm2 startOrRestart` + save, render Caddyfile (`__DOMAIN__` ← `.env`) + reload, prune to last 3 releases → health check (pm2 online + any HTTP code on :80). Satisfies `L2-DEVOPS-02`, `L2-DEVOPS-07`, `L2-DEVOPS-12`, `L2-DEVOPS-15`.
- `devops/deploy-for-pm2.sh` — deploy, pm2 flavor. Same flags/flow, with: remote steps source `$HOME/.nvm/nvm.sh` (non-interactive ssh has no profile — pm2/corepack live under nvm); db step branches — `systemctl is-active postgresql` → native (`pg_isready` on `127.0.0.1:$POSTGRES_PORT`), else docker present → compose up + health wait, else die with hint to db setup scripts; no proxy step (nginx+TLS owned by setup). Satisfies `L2-DEVOPS-02`, `L2-DEVOPS-07`, `L2-DEVOPS-12`, `L2-DEVOPS-15`.
- `devops/nginx/backflip.conf` — nginx site template: `__DOMAIN__`, proxy → `127.0.0.1:3070`, websocket upgrade headers; certbot injects TLS listener + redirect. Satisfies `L2-DEVOPS-05`.
- `devops/lib/common.sh` — sourced helpers: `log/ok/warn/die`, `remote_run` (ssh BatchMode + accept-new), `remote_copy` (scp), `sync_repo` (rsync `--delete`, excludes `.git node_modules .next .turbo .env* *.pem env*.deploy .releases`). Satisfies `L2-DEVOPS-03`.
- `devops/compose.prod.yml` — db-only (postgres:17-alpine, loopback `127.0.0.1:${POSTGRES_PORT:-5432}`, volume `backflip_pgdata`, healthcheck). Satisfies `L2-DEVOPS-04`.
- `devops/Caddyfile` — native-Caddy template: `__DOMAIN__ { reverse_proxy 127.0.0.1:3070 }`; deploy renders → `/etc/caddy/Caddyfile`. Satisfies `L2-DEVOPS-05`.
- `devops/pm2/ecosystem.config.cjs` + `devops/pm2/start.sh` — pm2 app `backflip`: start.sh sources `/opt/backflip/.env{,.local}`, exports `PORT=3070 HOSTNAME=127.0.0.1`, execs `node /opt/backflip/.releases/current/apps/web/server.js`. Satisfies `L2-DEVOPS-15`.
- `devops/env/production.env.example` → droplet `.env` (POSTGRES_*, `DATABASE_URL` → 127.0.0.1, ENCRYPTION_KEY, DOMAIN). `production.env.local.example` → droplet `.env.local` (AUTH_*). Satisfies `L2-DEVOPS-06`, `L2-DEVOPS-11`.
- `apps/web/next.config.ts` — `output: "standalone"` + `outputFileTracingRoot` = repo root (bundle mirrors monorepo, server at `apps/web/server.js`). Satisfies `L2-DEVOPS-16` (owning tag lives with `L2-UI-10` config).
- `.github/workflows/deploy.yml` / `.drone.yml` — thin wrappers → `deploy-for-docker.sh`. Satisfy `L2-DEVOPS-08`, `L2-DEVOPS-09`.
- `devops.md` (root) → `devops/docs/{droplet-setup,deploy-local,deploy-github-actions,deploy-drone}.md`.
- `.claude/skills/digitalocean-devops/SKILL.md` — explicit-trigger skill.

## How it hangs together
- App runs ON the host (pm2, fork mode, 1 instance); only Postgres is dockerized; Caddy native fronts 80/443 → 127.0.0.1:3070.
- Releases are immutable copies under `.releases/<ts>`; `current` symlink flip is the go-live moment. Everything before the flip (install/build/migrate) cannot affect the serving release; last 3 kept → fast rollback = repoint symlink + `pm2 restart backflip`.
- Migrations on host: root `db:migrate` → drizzle-kit; `packages/db/src/load-env.ts` reads `/opt/backflip/.env` (repo root = `/opt/backflip`) → loopback `DATABASE_URL`.
- Owner seed (one-off): scp `.env.init` → `/opt/backflip/.env.init`, `corepack yarn init-owner` on host, rm. No container gymnastics anymore.
- Build happens in the synced source tree; `.next` survives rsync (excluded+protected) → warm build cache between deploys.
- CI = thin wrappers only; deploy logic exists once in `deploy.sh` (`L2-DEVOPS-03`).

## Deviations / notes
- Flavors must not mix on one droplet: nginx and Caddy both bind 80/443.
- `sudo -u backflip` keeps the invoking cwd (often `/root`) — inaccessible to backflip → node/pm2 spawns die with EACCES. Every `sudo -H -u backflip` invocation must `cd` first (scripts do; remember for ad-hoc ssh commands).
- Current droplet 137.184.106.241 = pm2 flavor + native Postgres 17, instance `backflip` @ 3070, domain `backflip.dev-geddy.com` (LE cert issued 2026-07-29, auto-renew timer on).
- Base + hardening block intentionally duplicated between the two setup scripts (each stays single-file, runnable in one go); keep them in sync when editing.
- pm2-flavor CI: wrappers currently call `deploy-for-docker.sh` (pre-split behavior); switch the wrapper line to `deploy-for-pm2.sh` per droplet flavor.
- `sync_repo` doesn't support SSH key paths with spaces (rsync `-e` word-splitting).
- pm2 fork-mode restart on deploy = brief blip (~1s); accepted, no blue-green.
- Health check accepts any HTTP status on :80 (Caddy 308 → https expected).
- SSH after setup = key-only; password + keyboard-interactive auth off. Keep the droplet key safe — recovery is DO web console.
- Local full-docker path (`docker compose up --build`) now also runs the standalone bundle (see infra L3).

## TODO
- Optional: `--rollback` flag in deploy.sh (repoint symlink to previous release).
- Optional: pm2 cluster mode + `wait_ready` for zero-downtime reloads if the blip ever matters.
