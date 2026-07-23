# backflip

Lightweight full-stack platform foundation project behind Google Authentication. Built for kicking off consistent hassle free new projects without starting from scratch every time.

Monorepo: Next.js 16 · React 19 · Turborepo · yarn 4 (corepack).

## Dev environment

Two ways to run. Postgres always runs in Docker; the app runs either locally (preferred, faster HMR) or in Docker.

### Prerequisites
- Docker (daemon running)
- Node ≥ 20, corepack (`yarn@4.17.1` is pinned — always `corepack yarn …`)

### 1. Local app + Docker db (preferred for development)

App on **:3070** with hot reload, postgres in Docker.

```bash
cp .env.example .env          # first time only
docker compose up -d db       # postgres → localhost:${POSTGRES_PORT:-5544}
corepack yarn install
corepack yarn dev             # app → http://localhost:3070
```

App reads `DATABASE_URL` from `.env` (`localhost:5544`).

### Database (Drizzle)

Schema + migrations live in `packages/db` (`@workspace/db`).

```bash
corepack yarn db:generate     # generate SQL after schema change
corepack yarn db:migrate      # apply migrations to the docker db
corepack yarn db:studio       # drizzle studio
corepack yarn init-owner      # seed/refresh the platform owner
```

Owner seed reads `ADMIN_EMAIL` + `ADMIN_PASSWORD` from **`.env.local`** (gitignored). Example:

```
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<strong random string>
```

### 2. Full Docker (app + db)

App on **:3071** (containerized production build), postgres in Docker.

```bash
docker compose up --build     # app → http://localhost:3071
```

In-container the app connects to postgres at `db:5432` (set by compose, overrides `.env`).

### Ports
| Service  | Local dev  | Docker |
|----------|------------|--------|
| App      | 3070       | 3071   |
| Postgres | — (docker) | host `${POSTGRES_PORT:-5544}` → container 5432 |

`POSTGRES_PORT` default 5544 is kept off 5432 to avoid clashing with other local postgres. Change it in `.env` if it collides.

### Env / credentials
- `.env` — local, **gitignored**. Holds db credentials + `DATABASE_URL`.
- `.env.example` — committed template. Copy to `.env`.
- Same values seed the Docker postgres container and are read by the local app.

## Commands
See `.claude/skills/dev-workflow` for the full command set (build, lint, typecheck, shadcn, etc.).
