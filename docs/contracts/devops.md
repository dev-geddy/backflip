# Contract (L2) — devops

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-06`, `L1-STACK-07`, `L1-STACK-08`, `L1-STACK-09`
> **Depends on L2:** `infra` (shares the Next standalone build per `L2-INF-04`), `db` (migrations)

## Owns
Production deployment: DigitalOcean droplet provisioning, deploy pipeline (local + CI), prod runtime (pm2 + db compose), TLS.

## Interfaces
- `L2-DEVOPS-01` — Droplet provisioning, two flavors + db scripts, all idempotent: `setup-droplet-for-pm2.sh -h <host> -i <ssh-key> -d <domain> [-m email] [-n app-name] [--app-port p]` (nvm Node 24 + corepack yarn 4, pm2, nginx + certbot TLS, no Docker); `setup-droplet-for-docker.sh -h -i` (apt Node 24, pm2, native Caddy, Docker for db); `setup-droplet-db-native.sh [--db-name] [--db-user] [--db-password]` (Postgres 17 PGDG, loopback, role+db, prints DATABASE_URL); `setup-droplet-db-docker.sh` (Docker engine for db-only compose). Both setup flavors include swap, ufw 22/80/443, ssh hardening key-only + fail2ban + unattended-upgrades, app dirs.
- `L2-DEVOPS-02` — `deploy-for-pm2.sh` / `deploy-for-docker.sh -h <host> -i <ssh-key> [-n app-name] [--app-port p] [--env f] [--env-local f] [--skip-migrations]` — rsync → install → db ready (pm2 flavor: native `pg_isready` | compose health; docker flavor: compose health) → build → migrate → release switch → pm2 restart → proxy (docker: Caddy render+reload; pm2: nginx untouched, setup owns it) → health check. Works identically from local and CI.
- `L2-DEVOPS-08` — GitHub Actions deploy: `.github/workflows/deploy.yml`, `workflow_dispatch`, thin wrapper → `deploy-for-docker.sh`. Secrets: `DEPLOY_HOST`, `DEPLOY_SSH_KEY`, optional `DEPLOY_ENV`, `DEPLOY_ENV_LOCAL`.
- `L2-DEVOPS-09` — Drone deploy: `.drone.yml`, `promote` → `production`, thin wrapper → `deploy-for-docker.sh`. Secrets: `deploy_host`, `deploy_ssh_key`, optional `deploy_env`, `deploy_env_local`.

## Schemas
- `L2-DEVOPS-04` — Prod stack: app on the host via pm2; db per droplet choice — native Postgres 17 (loopback) or Docker (`devops/compose.prod.yml`, db-only, loopback `127.0.0.1:${POSTGRES_PORT:-5432}`; compose invoked `docker compose --project-directory . -f devops/compose.prod.yml` from the app dir).
- `L2-DEVOPS-05` — TLS + proxy → app loopback port, per flavor: pm2 — nginx, `devops/nginx/backflip.conf` template (`__DOMAIN__`/`__PORT__`) rendered at setup to `/etc/nginx/sites-available/<app-name>.conf`, certbot (Let's Encrypt) with auto-renew; docker — native Caddy auto-cert, `devops/Caddyfile` (`__DOMAIN__`) rendered by deploy → `/etc/caddy/Caddyfile` → reload.
- `L2-DEVOPS-06` — Droplet runtime env: `/opt/backflip/.env` (incl. `DATABASE_URL` → `127.0.0.1`) + `/opt/backflip/.env.local` (same split as local, see `L2-INF-07`). Templates `devops/env/production.env{,.local}.example`. Deploy never overwrites them unless `--env`/`--env-local` passed.
- `L2-DEVOPS-15` — Runtime: pm2 process `<app-name>` (`devops/pm2/ecosystem.config.cjs` → `start.sh`, env-driven `APP_NAME`/`APP_DIR`/`APP_PORT`) serves `/opt/<app-name>/.releases/current` (symlink → timestamped immutable release, last 3 kept) on `127.0.0.1:<app-port>`.
- `L2-DEVOPS-16` — App artifact: Next standalone build (`output: "standalone"`, tracing root = repo root); entry `apps/web/server.js`. Shared with the Docker image (`L2-INF-04`).

## Invariants
- `L2-DEVOPS-03` — Single deploy path: all logic in `devops/*.sh` (shared `devops/lib/common.sh`); CI configs are thin wrappers calling `deploy.sh` — never duplicate deploy logic in CI YAML.
- `L2-DEVOPS-07` — Migrations (`corepack yarn db:migrate`, host → loopback db) run after build, before the release switch.
- `L2-DEVOPS-10` — Only required operator inputs: droplet host + local SSH key path. Everything else scripted or in env files.
- `L2-DEVOPS-11` — No secrets in git or CI logs; env files land only on the droplet (0600).
- `L2-DEVOPS-17` — Privilege model: app + pm2 run as locked `backflip` user (no password/ssh); `/opt/<app-name>` owned by it; root does only system work (packages, db, proxy, firewall). Deploy app-phase runs via `sudo -u backflip`.
- `L2-DEVOPS-18` — Multi-instance: instance identity = app name + port (`-n`/`--app-port`, defaults `backflip`/3070) → own dir, pm2 app, nginx site, cert; deploys affect only the named instance (pm2 `--only`, name-scoped health check). pm2-flavor feature; docker flavor's Caddy config is single-site.

## Errors
- `L2-DEVOPS-12` — Deploy with no `.env`/`.env.local` on droplet → dies with hint to templates + `--env` flags.

## Acceptance
- `L2-DEVOPS-13` — Fresh droplet + DNS A record: `setup-droplet.sh` then `deploy.sh --env … --env-local …` → app served at `https://$DOMAIN`, migrations applied.
- `L2-DEVOPS-14` — Re-running `deploy.sh` with no changes is safe (idempotent, no env overwrite); any failure before the release switch leaves the previous release serving.

## Constrained L3
- `/docs/notes/devops.md`

---
IDs: `L2-DEVOPS-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
