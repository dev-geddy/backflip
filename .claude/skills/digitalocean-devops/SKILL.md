---
name: digitalocean-devops
description: >
  Covers provisioning a DigitalOcean droplet and deploying this app to it
  (local script, GitHub Actions, Drone CI), migrations included. Load ONLY
  when the user explicitly asks about deployment, devops, the droplet,
  DigitalOcean, or CI deploys. Also on: "deploy", "deployment", "droplet",
  "digitalocean", "provision server", "devops".
---

# digitalocean-devops

How this repo provisions and deploys to a DigitalOcean droplet. Terse. Do not
load for general dev tasks — see `dev-workflow` for that.

## Layout
- `devops/setup-droplet.sh` — one-time, idempotent droplet provisioning.
- `devops/deploy.sh` — deploy/redeploy entrypoint.
- `devops/lib/common.sh` — shared helpers sourced by both scripts.
- `devops/compose.prod.yml` — prod stack: db + app + Caddy.
- `devops/Caddyfile` — reverse proxy config.
- `devops/env/*.example` — env templates (source for first deploy's `.env`/`.env.local`).
- Docs: root `devops.md` (index) → `devops/docs/{droplet-setup,deploy-local,deploy-github-actions,deploy-drone}.md` (one per build setup).
- CI: `.github/workflows/deploy.yml` (`workflow_dispatch`), `.drone.yml` (promote → production).

## Key commands
- Provision (once): `./devops/setup-droplet.sh -h <host> -i <ssh-key>`.
- Deploy: `./devops/deploy.sh -h <host> -i <ssh-key> [--env <f> --env-local <f>] [--skip-migrations]`.
  - First deploy: pass `--env`/`--env-local`, filled from `devops/env/*.example`.
  - Later deploys: omit them — droplet env is never overwritten.
  - Flow: rsync → build on droplet → drizzle migrate in-container → up → health check.

## Conventions (preserve when extending)
- All deploy logic lives in `devops/*.sh`. CI files (`deploy.yml`, `.drone.yml`) are thin wrappers that call `deploy.sh` — never duplicate logic in CI YAML.
- New CI provider = new thin wrapper script + new short doc in `devops/docs/`, linked from `devops.md`.
- Docs stay short and actionable.
- Droplet runtime env = `/opt/backflip/.env` + `.env.local`.
- Compose is always invoked as `docker compose --project-directory . -f devops/compose.prod.yml`, run from `/opt/backflip`.

## Before changing anything
Read `devops.md` + the relevant `devops/docs/*.md` first. Domain contract:
`docs/contracts/devops.md` (L2). Follow `docs-sync` for any doc updates.
