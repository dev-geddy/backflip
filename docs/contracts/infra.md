# Contract (L2) — infra

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-06`, `L1-STACK-07`, `L1-STACK-08`
> **Depends on L2:** none

## Owns
Local dev infrastructure: Docker Compose services (app, postgres), ports, env/credentials.

## Interfaces
- `L2-INF-01` — `docker compose up` → app + db. App host **3071** → container 3070. (`docker-compose.yml`)
- `L2-INF-02` — `docker compose up db` → postgres only (preferred dev: db in Docker, app run locally).
- `L2-INF-03` — App local dev port **3070** (`corepack yarn dev`); local prod `corepack yarn workspace web start` also 3070.
- `L2-INF-04` — App Docker image — Next standalone build (`output: "standalone"`), runner ships only the bundle, `node apps/web/server.js` on container 3070. (`apps/web/Dockerfile`, context = repo root) **[PROPOSED AMENDMENT — was `next build` + `next start`; awaiting approval]**

## Schemas
- `L2-INF-05` — Postgres service: image `postgres:17-alpine`, host port `${POSTGRES_PORT:-5544}` → 5432, volume `backflip_pgdata`, healthcheck `pg_isready`.
- `L2-INF-06` — `DATABASE_URL` — app→db connection. Local app: `localhost:${POSTGRES_PORT}`. In-container app: `db:5432` (compose env overrides `.env`).
- `L2-INF-07` — Env vars: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `DATABASE_URL`. Defined in `.env` (copy of `.env.example`).

## Invariants
- `L2-INF-08` — Postgres host port kept off default 5432 to avoid clashing with other local pg. Configurable via `POSTGRES_PORT`.
- `L2-INF-09` — No secrets committed. `.env` gitignored; only `.env.example` tracked (`!.env.example` in `.gitignore`).
- `L2-INF-10` — One credential source: `.env` seeds the db container AND is read by the local app. No divergent copies.

## Errors
- `L2-INF-11` — Host port in use (e.g. 5544 or 3071 taken) → compose bind error. Change `POSTGRES_PORT` in `.env` / free the port.

## Acceptance
- `L2-INF-12` — `docker compose up -d db` + `corepack yarn dev` → app on 3070 reaches db on `localhost:${POSTGRES_PORT}`.
- `L2-INF-13` — `docker compose up --build` → app on 3071, db healthy, app reaches db at `db:5432`.

## Constrained L3
- `/docs/notes/infra.md`

---
IDs: `L2-INF-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
