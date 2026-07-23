# Contract (L2) — db

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-06`, `L1-STACK-07`, `L1-STACK-09`
> **Depends on L2:** `infra` (DATABASE_URL, postgres container)

## Owns
Shared data layer: `packages/db` (`@workspace/db`) — Drizzle schema, client, migrations, seed.

## Interfaces
- `L2-DB-01` — `@workspace/db` → `db` — Drizzle client (node-postgres) over `DATABASE_URL`. (`packages/db/src/client.ts`)
- `L2-DB-02` — `@workspace/db` re-exports schema tables + `db`. (`packages/db/src/index.ts`)
- `L2-DB-03` — Scripts (root): `corepack yarn db:generate | db:migrate | db:studio`, `corepack yarn init-owner`. Per-pkg: `db:push` too.
- `L2-DB-04` — `corepack yarn init-owner` — seeds/updates platform owner from `.env.local` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`), bcrypt-hashed, role `owner`. Idempotent (upsert on email).

## Schemas
- `L2-DB-05` — `user_role` enum: `owner` | `admin` | `member`.
- `L2-DB-06` — `user` table: `id` (uuid text pk), `name`, `email` (unique, not null), `emailVerified`, `image`, `passwordHash` (bcrypt, null = OAuth-only), `role` (default `member`), `createdAt`.
- `L2-DB-07` — Auth.js adapter tables: `account`, `session`, `verificationToken` (standard Auth.js Drizzle shape).
- `L2-DB-08` — Migrations: drizzle-kit generated SQL in `packages/db/migrations/`, committed. Dialect postgresql.

## Invariants
- `L2-DB-09` — One schema source: `packages/db/src/schema.ts`. Apps import types/tables from `@workspace/db`, never redeclare.
- `L2-DB-10` — Passwords stored only as bcrypt hashes (`passwordHash`). Never plaintext.
- `L2-DB-11` — Migrations are forward-only committed artifacts; schema change → `db:generate` + commit the SQL.

## Errors
- `L2-DB-12` — Missing `DATABASE_URL` → client/seed throws. Ensure `.env` present (db up).
- `L2-DB-13` — `init-owner` without `ADMIN_EMAIL`/`ADMIN_PASSWORD` → throws (define in `.env.local`).

## Acceptance
- `L2-DB-14` — `db:migrate` on the docker db creates all 4 tables.
- `L2-DB-15` — `init-owner` yields a `user` row: email from `.env.local`, role `owner`, non-null `passwordHash`. Re-run updates, no duplicate.

## Constrained L3
- `/docs/notes/db.md`

---
IDs: `L2-DB-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
