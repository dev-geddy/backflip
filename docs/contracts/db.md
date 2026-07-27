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
- `L2-DB-03` — Scripts (root): `corepack yarn db:generate | db:migrate | db:studio`, `corepack yarn init-owner`. Per-pkg: `db:push` too. Migrate/generate/studio via drizzle-kit.
- `L2-DB-16` — `encryptSecret(plain)` / `decryptSecret(enc)` — AES-256-GCM over `ENCRYPTION_KEY` (sha256-derived). For secrets at rest (AI keys). Server-only. (`packages/db/src/crypto.ts`)
- `L2-DB-19` — `generateToken()` / `hashToken(raw)` — one-time link tokens: `generateToken` returns a 32-byte base64url random string (the raw token, never stored); `hashToken` returns its sha256 hex (what is persisted + looked up). Server-only. (`packages/db/src/crypto.ts`)
- `L2-DB-04` — `corepack yarn init-owner` — seeds/updates platform owner from `.env.init` (one-off file, loaded only by the seed via `load-init-env.ts`; never injected into the running app). `ADMIN_EMAIL` required; `ADMIN_PASSWORD` optional (omit → Google-only owner, `passwordHash` null; re-run without it preserves any existing hash). Role `owner`. Idempotent (upsert on email).

## Schemas
- `L2-DB-05` — `user_role` enum: `owner` | `admin` | `teammate`. (Renamed `member`→`teammate` in migration `0002`; capability semantics owned by the `auth` domain.)
- `L2-DB-06` — `user` table: `id` (uuid text pk), `name`, `email` (unique, not null), `emailVerified`, `image`, `passwordHash` (bcrypt, null = OAuth-only), `role` (default `teammate`), `tokenVersion` (int, default 0), `createdAt`.
- `L2-DB-22` — `user.tokenVersion` — monotonic session-revocation counter. Embedded in the JWT and revalidated per request; bumped on password change, password reset, and confirmed email change to invalidate existing sessions. Owned by the `auth` domain (`L2-AUTH-36`).
- `L2-DB-07` — Auth.js adapter tables: `account`, `session`, `verificationToken` (standard Auth.js Drizzle shape).
- `L2-DB-08` — Migrations: drizzle-kit generated SQL in `packages/db/migrations/`, committed. Dialect postgresql. Applied via `drizzle-kit migrate` (`db:migrate`).
- `L2-DB-17` — `ai_config` table (one row per `ai_provider` enum: anthropic|openai|google): `provider` (unique), `model`, `apiKeyEnc` (AES), `baseUrl`, `temperature` (default 0.7), `enabled`, `isDefault`, `updatedAt`. Owned by the `ai` domain.
- `L2-DB-18` — `email_config` table (single row, `provider` unique default `resend`): `provider`, `apiKeyEnc` (AES), `fromEmail`, `fromName`, `replyTo`, `enabled`, `updatedAt`. Owned by the `email` domain.
- `L2-DB-20` — `user_token_type` enum (`password_reset` | `email_change`) + `user_token` table: `id`, `userId` (fk → user, cascade), `type`, `tokenHash` (unique — sha256 of raw), `newEmail` (nullable; email_change only), `expiresAt`, `consumedAt` (nullable), `createdAt`. Single-use, time-boxed. Owned by the `auth` domain.

## Invariants
- `L2-DB-09` — One schema source: `packages/db/src/schema.ts`. Apps import types/tables from `@workspace/db`, never redeclare.
- `L2-DB-10` — Passwords stored only as bcrypt hashes (`passwordHash`). Never plaintext.
- `L2-DB-21` — One-time tokens stored only as `hashToken` output (`tokenHash`), never the raw token. Raw exists only in the emailed link. Validity requires un-consumed + un-expired.
- `L2-DB-11` — Migrations are forward-only committed artifacts; schema change → `db:generate` + commit the SQL.

## Errors
- `L2-DB-12` — Missing `DATABASE_URL` → client/seed throws. Ensure `.env` present (db up).
- `L2-DB-13` — `init-owner` without `ADMIN_EMAIL` → throws (define in `.env.init`). `ADMIN_PASSWORD` is optional (omit → Google-only owner).

## Acceptance
- `L2-DB-14` — `db:migrate` on the docker db creates all tables (user, account, session, verificationToken, ai_config, email_config, user_token); migration `0002` renames role `member`→`teammate`; `0003` adds `user_token`; `0004` adds `user.tokenVersion`.
- `L2-DB-15` — `init-owner` yields a `user` row: email from `.env.init`, role `owner`. `passwordHash` non-null when `ADMIN_PASSWORD` is set, else null (Google-only owner). Re-run updates, no duplicate.

## Constrained L3
- `/docs/notes/db.md`

---
IDs: `L2-DB-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
