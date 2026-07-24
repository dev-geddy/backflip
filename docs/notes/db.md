# Notes (L3) — db

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `packages/db/package.json` — `@workspace/db`. Deps: drizzle-orm, pg, bcryptjs. Dev: drizzle-kit, tsx, dotenv, @types/pg. Scripts satisfy `L2-DB-03`.
- `packages/db/src/schema.ts` — Drizzle schema. `user_role` enum (`owner|admin|teammate`) + `user`/`account`/`session`/`verificationToken`; `ai_provider` enum + `ai_config`; `email_config`. Satisfies `L2-DB-05`, `L2-DB-06`, `L2-DB-07`, `L2-DB-17`, `L2-DB-18`.
- `packages/db/src/client.ts` — `db = drizzle(process.env.DATABASE_URL!, { schema })` (node-postgres). Satisfies `L2-DB-01`.
- `packages/db/src/index.ts` — barrel: `export * from schema` + `db`. Satisfies `L2-DB-02`, `L2-DB-09`.
- `packages/db/src/load-env.ts` — loads root `.env` + `.env.local` (root = 3 up from src). Imported first by standalone scripts (seed, drizzle.config).
- `packages/db/src/seed/owner.ts` — `init-owner`. Reads `ADMIN_EMAIL`/`ADMIN_PASSWORD`, bcrypt(12), upsert on email, role `owner`. Satisfies `L2-DB-04`.
- `packages/db/drizzle.config.ts` — dialect postgresql, schema `src/schema.ts`, out `migrations/`. Imports `load-env`.
- `packages/db/src/crypto.ts` — `encryptSecret`/`decryptSecret` (AES-256-GCM, key = sha256(`ENCRYPTION_KEY`)). Satisfies `L2-DB-16`.
- `packages/db/migrations/` — `0000` baseline, `0001` email_config, `0002` role rename `member`→`teammate`, + `meta/`. Satisfies `L2-DB-08`.

## Role rename (migration 0002)
- `user_role` value `member` → `teammate`. drizzle-kit generated a drop/recreate (`SET DATA TYPE text` → `DROP TYPE` → recreate → recast); hand-replaced with `ALTER TYPE ... RENAME VALUE 'member' TO 'teammate'` + `ALTER COLUMN role SET DEFAULT 'teammate'`. Rename preserves rows + the default binding and reaches the same end state as the `0002` snapshot (drop/recreate would reject any existing `member` row on the recast). Not yet applied here (no DB in the web session); apply with `db:migrate` when a DB is up.

## Gotcha — type-change migrations
- `drizzle-kit generate` emits column type changes as bare `SET DATA TYPE` with no `USING` cast. For incompatible casts (e.g. text→integer) Postgres rejects the SQL, and `drizzle-kit migrate` fails *quietly* (prints "applying…", no success line, journal not advanced — looks like a no-op). Fix: hand-edit the generated SQL to add `USING <col>::<type>`, or `db:push` in dev. (This is what broke the old `0001`; the baseline was squashed to avoid it.)

## Notes / deviations
- tsconfig overrides base to `module ESNext` + `moduleResolution Bundler` (pkg is consumed by Next bundler + run by tsx; avoids NodeNext `.js` extension churn).
- Column names kept Auth.js-exact (camelCase, quoted in pg): `passwordHash`, `emailVerified`, `providerAccountId`, etc. Query with double-quotes in raw SQL.
- `account.expires_at` typed `integer` (required by `@auth/drizzle-adapter` types).
- `session`/`verificationToken` tables unused under JWT strategy; kept for adapter completeness.
- Env: `DATABASE_URL` (localhost:5544) in `.env`; admin seed creds in `.env.local` (both gitignored).

## State
- Owner seeded: `gigedas@gmail.com`, role `owner`. Migrations applied to docker db.
- No app code consumes `@workspace/db` yet — auth wiring is the next phase.

## TODO
- Auth.js DrizzleAdapter + Credentials/Google (auth domain) consumes these tables next.
