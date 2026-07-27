# Notes (L3) — devops

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.
> Parent contract `/docs/contracts/devops.md` is **PROPOSED** (pending human approval).

## File map
- `devops/setup-droplet.sh` — one-time provision: apt base pkgs, Docker via get.docker.com (skip if present), compose plugin, ufw (OpenSSH/80/443 tcp+udp), `/opt/backflip`. sudo fallback for non-root user. Satisfies `L2-DEVOPS-01`.
- `devops/deploy.sh` — flags `-h -i [-u -p] [--env] [--env-local] [--skip-migrations]`. Flow: preflight ssh → optional env upload (0600) → verify droplet env → `sync_repo` → remote: build app, up db, wait healthy (60s), `run --rm --no-deps app corepack yarn db:migrate`, `up -d`, image prune → health check (any HTTP code on :80 = alive; Caddy 308s to https). Satisfies `L2-DEVOPS-02`, `L2-DEVOPS-07`, `L2-DEVOPS-12`.
- `devops/lib/common.sh` — sourced helpers: `log/ok/warn/die`, `remote_run` (ssh BatchMode + accept-new), `remote_copy` (scp), `sync_repo` (rsync `--delete`, excludes `.git node_modules .next .turbo .env* *.pem env*.deploy`). Satisfies `L2-DEVOPS-03`.
- `devops/compose.prod.yml` — standalone prod stack: db (postgres:17-alpine, internal only) + app (build `apps/web/Dockerfile`, `DATABASE_URL` override → `db:5432`, expose 3070) + caddy (80/443 + 443/udp). Volumes `backflip_pgdata`, `caddy_data`, `caddy_config`. Satisfies `L2-DEVOPS-04`.
- `devops/Caddyfile` — `{$DOMAIN} { reverse_proxy app:3070 }`, auto-TLS. Satisfies `L2-DEVOPS-05`.
- `devops/env/production.env.example` → droplet `.env` (POSTGRES_*, ENCRYPTION_KEY, DOMAIN). `production.env.local.example` → droplet `.env.local` (AUTH_*). Satisfies `L2-DEVOPS-06`, `L2-DEVOPS-11`.
- `.github/workflows/deploy.yml` — `workflow_dispatch` (commented push:main), concurrency `deploy-production`, writes key + optional env secrets → calls `deploy.sh`. Satisfies `L2-DEVOPS-08`.
- `.drone.yml` — promote→production trigger, alpine step (apk: bash/ssh/rsync/curl) → calls `deploy.sh`. Satisfies `L2-DEVOPS-09`.
- `devops.md` (root, linked from README) — index → `devops/docs/{droplet-setup,deploy-local,deploy-github-actions,deploy-drone}.md` (one doc per build setup).
- `.claude/skills/digitalocean-devops/SKILL.md` — explicit-trigger skill; layout, commands, conventions.

## How it hangs together
- Compose always invoked `docker compose --project-directory . -f devops/compose.prod.yml` from `/opt/backflip` — relative paths + `${...}` interpolation resolve against repo root / droplet `.env`.
- Build happens ON the droplet (rsync source, `build app`); no registry involved.
- Migrations: root `db:migrate` → `drizzle-kit migrate`; `load-env.ts` dotenv never overrides process env, and `.dockerignore` excludes `.env*` from the image → in-container `DATABASE_URL` (db:5432) always wins.
- CI = thin wrappers only; deploy logic exists once in `deploy.sh` (`L2-DEVOPS-03`).
- Owner seed on prod: manual one-off (scp `.env.init` → `run --rm --no-deps -v /opt/backflip/.env.init:/repo/.env.init:ro app corepack yarn init-owner` → rm). Bind mount required — `.dockerignore` strips `.env*` from the image, so the host file is otherwise invisible in-container. Documented in `devops/docs/droplet-setup.md`.

## Deviations / notes
- `sync_repo` doesn't support SSH key paths with spaces (rsync `-e` word-splitting).
- App image ships full repo + all deps (existing `L2-INF-04` Dockerfile) — dev deps make in-container `db:migrate` possible; `output: standalone` slimming stays a TODO in infra L3.
- Health check accepts any HTTP status on :80 (Caddy 308 expected before/without DNS).

## TODO
- Optional: deploy-time `--init-owner` flag instead of the manual seed procedure.
- Optional: build in CI + push to a registry if droplet builds get slow.
