# Notes (L3) — db

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `packages/db/package.json` — `@workspace/db`. Deps: drizzle-orm, pg, bcryptjs. Dev: drizzle-kit, tsx, dotenv, @types/pg. Scripts satisfy `L2-DB-03`.
- `packages/db/src/schema.ts` — Drizzle schema. `user_role` enum + `user`/`account`/`session`/`verificationToken`. Satisfies `L2-DB-05`, `L2-DB-06`, `L2-DB-07`.
- `packages/db/src/client.ts` — `db = drizzle(process.env.DATABASE_URL!, { schema })` (node-postgres). Satisfies `L2-DB-01`.
- `packages/db/src/index.ts` — barrel: `export * from schema` + `db`. Satisfies `L2-DB-02`, `L2-DB-09`.
- `packages/db/src/load-env.ts` — loads root `.env` + `.env.local` (root = 3 up from src). Imported first by standalone scripts (seed, drizzle.config).
- `packages/db/src/seed/owner.ts` — `init-owner`. Reads `ADMIN_EMAIL`/`ADMIN_PASSWORD`, bcrypt(12), upsert on email, role `owner`. Satisfies `L2-DB-04`.
- `packages/db/drizzle.config.ts` — dialect postgresql, schema `src/schema.ts`, out `migrations/`. Imports `load-env`.
- `packages/db/migrations/` — generated SQL (`0000_*.sql`) + `meta/`. Satisfies `L2-DB-08`.

## Notes / deviations
- tsconfig overrides base to `module ESNext` + `moduleResolution Bundler` (pkg is consumed by Next bundler + run by tsx; avoids NodeNext `.js` extension churn).
- Column names kept Auth.js-exact (camelCase, quoted in pg): `passwordHash`, `emailVerified`, `providerAccountId`, etc. Query with double-quotes in raw SQL.
- `account.expires_at` typed `text` (Auth.js example uses integer; either works — revisit if adapter complains).
- `session`/`verificationToken` tables unused under JWT strategy; kept for adapter completeness.
- Env: `DATABASE_URL` (localhost:5544) in `.env`; admin seed creds in `.env.local` (both gitignored).

## State
- Owner seeded: `gigedas@gmail.com`, role `owner`. Migrations applied to docker db.
- No app code consumes `@workspace/db` yet — auth wiring is the next phase.

## TODO
- Auth.js DrizzleAdapter + Credentials/Google (auth domain) consumes these tables next.
