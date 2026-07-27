# Notes (L3) — infra

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `docker-compose.yml` — services `db` + `app`. Satisfies `L2-INF-01`, `L2-INF-02`, `L2-INF-05`. `name: backflip`. Volume `backflip_pgdata`.
- `apps/web/Dockerfile` — 3-stage (base → build → runner), context = repo root. `corepack enable`, `yarn install --immutable`, `yarn workspace web build`, runs `yarn workspace web start`. Satisfies `L2-INF-04`.
- `.dockerignore` — excludes node_modules, `.next`, `.turbo`, `.git`, `.env*` (keeps `.env.example`).
- `.env.example` — committed template. `.env` — gitignored, local creds. Satisfies `L2-INF-07`, `L2-INF-09`.
- `apps/web/package.json` — `dev` = `next dev -p 3070`, `start` = `next start -p 3070`. Satisfies `L2-INF-03`.
- `.gitignore` — `.env*` then `!.env.example`. Satisfies `L2-INF-09`.
- `README.md` — run instructions (local-app+docker-db; full-docker).

## State
- Preferred dev: app local (3070) + db in Docker. Full-docker (app 3071) is the alt run path.
- App Docker = prod build, no hot reload (local is the dev driver).
- `DATABASE_URL` consumed by `@workspace/db` (app + seed).

## Env loading (monorepo)
- Three root env files, by lifecycle: `.env` (db/infra, runtime), `.env.local` (Auth.js runtime secrets), `.env.init` (one-off owner seed — `ADMIN_*`). Next runs in `apps/web` so it won't read root env by itself.
- Local dev: `web` `dev` script uses `dotenv-cli` (`dotenv -e ../../.env -e ../../.env.local -- next dev`) to inject root env (needed by edge proxy + node routes). `.env.init` is intentionally NOT loaded here — admin creds stay out of the app env.
- Docker app: compose `env_file: [.env, .env.local]` injects env; `DATABASE_URL` overridden to `db:5432` via `environment:`. `.env.init` intentionally excluded (seed-only).
- `.env.init` is read only by `corepack yarn init-owner` (via `packages/db/src/seed/load-init-env.ts`). Committed template: `.env.init.example`.
- Postgres 5544 verified clear (existing pg containers on 5436/5437).

## Ports
- App: local 3070 / docker host 3071 → container 3070.
- Postgres: host `${POSTGRES_PORT:-5544}` → container 5432. Default 5544 chosen off 5432 (docker daemon was down at setup — couldn't scan existing images; verify no clash, adjust `POSTGRES_PORT` if needed). Satisfies `L2-INF-08`.

## TODO
- Wire a Postgres client / migrations when the data layer starts.
- Optional: Next `output: "standalone"` for a leaner app image.
- Optional: dev-mode app container with source mount if containerized hot reload is ever wanted.
