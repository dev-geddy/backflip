# Notes (L3) — devops

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `devops/setup-droplet.sh` — one-time provision: apt base pkgs, 2G swap (if none — Next build OOM guard), Docker via get.docker.com (db only), Node 24 (NodeSource) + corepack, pm2 (+systemd startup unit), native Caddy (official apt repo), ufw (OpenSSH/80/443 tcp+udp), `/opt/backflip` + `.releases`. sudo fallback. Satisfies `L2-DEVOPS-01`.
- `devops/deploy.sh` — flags `-h -i [-u -p] [--env] [--env-local] [--skip-migrations]`. Flow: preflight ssh → optional env upload (0600) → verify droplet env → `sync_repo` → remote: `yarn install --immutable`, db up + health wait (60s), `yarn workspace web build`, `yarn db:migrate` (host → loopback db), copy standalone bundle → `/opt/backflip/.releases/<utc-ts>`, flip `current` symlink, `pm2 startOrRestart` + save, render Caddyfile (`__DOMAIN__` ← `.env`) + reload, prune to last 3 releases → health check (pm2 online + any HTTP code on :80). Satisfies `L2-DEVOPS-02`, `L2-DEVOPS-07`, `L2-DEVOPS-12`, `L2-DEVOPS-15`.
- `devops/lib/common.sh` — sourced helpers: `log/ok/warn/die`, `remote_run` (ssh BatchMode + accept-new), `remote_copy` (scp), `sync_repo` (rsync `--delete`, excludes `.git node_modules .next .turbo .env* *.pem env*.deploy .releases`). Satisfies `L2-DEVOPS-03`.
- `devops/compose.prod.yml` — db-only (postgres:17-alpine, loopback `127.0.0.1:${POSTGRES_PORT:-5432}`, volume `backflip_pgdata`, healthcheck). Satisfies `L2-DEVOPS-04`.
- `devops/Caddyfile` — native-Caddy template: `__DOMAIN__ { reverse_proxy 127.0.0.1:3070 }`; deploy renders → `/etc/caddy/Caddyfile`. Satisfies `L2-DEVOPS-05`.
- `devops/pm2/ecosystem.config.cjs` + `devops/pm2/start.sh` — pm2 app `backflip`: start.sh sources `/opt/backflip/.env{,.local}`, exports `PORT=3070 HOSTNAME=127.0.0.1`, execs `node /opt/backflip/.releases/current/apps/web/server.js`. Satisfies `L2-DEVOPS-15`.
- `devops/env/production.env.example` → droplet `.env` (POSTGRES_*, `DATABASE_URL` → 127.0.0.1, ENCRYPTION_KEY, DOMAIN). `production.env.local.example` → droplet `.env.local` (AUTH_*). Satisfies `L2-DEVOPS-06`, `L2-DEVOPS-11`.
- `apps/web/next.config.ts` — `output: "standalone"` + `outputFileTracingRoot` = repo root (bundle mirrors monorepo, server at `apps/web/server.js`). Satisfies `L2-DEVOPS-16` (owning tag lives with `L2-UI-10` config).
- `.github/workflows/deploy.yml` / `.drone.yml` — unchanged thin wrappers → `deploy.sh`. Satisfy `L2-DEVOPS-08`, `L2-DEVOPS-09`.
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
- `sync_repo` doesn't support SSH key paths with spaces (rsync `-e` word-splitting).
- pm2 fork-mode restart on deploy = brief blip (~1s); accepted, no blue-green.
- Health check accepts any HTTP status on :80 (Caddy 308 → https expected).
- Local full-docker path (`docker compose up --build`) now also runs the standalone bundle (see infra L3).

## TODO
- Optional: `--rollback` flag in deploy.sh (repoint symlink to previous release).
- Optional: pm2 cluster mode + `wait_ready` for zero-downtime reloads if the blip ever matters.
