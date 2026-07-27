# Contract (L2) — devops

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-06`, `L1-STACK-07`, `L1-STACK-08`, `L1-STACK-09`
> **Depends on L2:** `infra` (shares the Next standalone build per `L2-INF-04`), `db` (migrations)

## Owns
Production deployment: DigitalOcean droplet provisioning, deploy pipeline (local + CI), prod runtime (pm2 + db compose), TLS.

## Interfaces
- `L2-DEVOPS-01` — `./devops/setup-droplet.sh -h <host> -i <ssh-key> [-u user] [-p port]` — one-time droplet provision (Docker for db, Node 24 + pm2, native Caddy, swap, ufw 22/80/443, `/opt/backflip`). Idempotent. **[PROPOSED: Node 20 → 24 — awaiting approval]**
- `L2-DEVOPS-02` — `./devops/deploy.sh -h <host> -i <ssh-key> [--env f] [--env-local f] [--skip-migrations]` — rsync → install → build → migrate → release switch → pm2 restart → Caddy reload → health check. Works identically from local and CI.
- `L2-DEVOPS-08` — GitHub Actions deploy: `.github/workflows/deploy.yml`, `workflow_dispatch`. Secrets: `DEPLOY_HOST`, `DEPLOY_SSH_KEY`, optional `DEPLOY_ENV`, `DEPLOY_ENV_LOCAL`.
- `L2-DEVOPS-09` — Drone deploy: `.drone.yml`, `promote` → `production`. Secrets: `deploy_host`, `deploy_ssh_key`, optional `deploy_env`, `deploy_env_local`.

## Schemas
- `L2-DEVOPS-04` — Prod stack: db in Docker (`devops/compose.prod.yml`, db-only, loopback `127.0.0.1:${POSTGRES_PORT:-5432}`); app on the host via pm2; Caddy native (systemd). Compose invoked `docker compose --project-directory . -f devops/compose.prod.yml` from `/opt/backflip`.
- `L2-DEVOPS-05` — TLS: native Caddy, auto-cert for `${DOMAIN}`; `devops/Caddyfile` template (`__DOMAIN__`) rendered by deploy → `/etc/caddy/Caddyfile` → reload. Proxies → `127.0.0.1:3070`.
- `L2-DEVOPS-06` — Droplet runtime env: `/opt/backflip/.env` (incl. `DATABASE_URL` → `127.0.0.1`) + `/opt/backflip/.env.local` (same split as local, see `L2-INF-07`). Templates `devops/env/production.env{,.local}.example`. Deploy never overwrites them unless `--env`/`--env-local` passed.
- `L2-DEVOPS-15` — Runtime: pm2 process `backflip` (`devops/pm2/ecosystem.config.cjs` → `start.sh`) serves `/opt/backflip/.releases/current` (symlink → timestamped immutable release, last 3 kept) on `127.0.0.1:3070`.
- `L2-DEVOPS-16` — App artifact: Next standalone build (`output: "standalone"`, tracing root = repo root); entry `apps/web/server.js`. Shared with the Docker image (`L2-INF-04`).

## Invariants
- `L2-DEVOPS-03` — Single deploy path: all logic in `devops/*.sh` (shared `devops/lib/common.sh`); CI configs are thin wrappers calling `deploy.sh` — never duplicate deploy logic in CI YAML.
- `L2-DEVOPS-07` — Migrations (`corepack yarn db:migrate`, host → loopback db) run after build, before the release switch.
- `L2-DEVOPS-10` — Only required operator inputs: droplet host + local SSH key path. Everything else scripted or in env files.
- `L2-DEVOPS-11` — No secrets in git or CI logs; env files land only on the droplet (0600).

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
