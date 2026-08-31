# Contract (L2) — clickup

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-01` (admin surface), `L1-STACK-07` (Postgres config), `L1-STACK-09` (Drizzle schema + migrations)
> **Depends on L2:** `db` (`clickup_config`, `L2-DB-16` crypto), `auth` (settings gate), `ui` (Input/Switch/Field/Button)

## Owns
ClickUp operator config under `/backflip/settings` (backed by `clickup_config`) — personal API token, default workspace id, enabled flag — plus a read-only connection probe.

Explicitly **not** owned: task/list/comment call sites (none exist yet — this is config plumbing for them), and the OAuth app flow (reserved columns only, `L2-CLICKUP-07`).

## Interfaces
- `L2-CLICKUP-02` — Server action `saveClickupConfig(prev, formData)` — upserts the single `clickup_config` row on `kind`. `settings`-gated. Token encrypted when supplied; blank keeps existing. (`apps/web/app/backflip/(protected)/settings/_actions.ts`)
- `L2-CLICKUP-03` — Server action `testClickupConnection()` + `fetchClickupIdentity(token)` — probe via `GET https://api.clickup.com/api/v2/user` + `/team` (`Authorization: <token>`, no `Bearer`), token decrypted server-side only; returns `{ok, message}` naming the resolved user + workspace count. 10s timeout, no-store. Read-only in ClickUp. (`settings/_actions.ts`, `settings/_lib/clickup.ts`)
- `L2-CLICKUP-04` — Route `/backflip/settings` → ClickUp integration — sixth master-detail entry; fields: API token (masked, no reveal), default workspace id, Enabled, plus "Test connection". List row reads "connected" iff a token is saved. (`settings/_components/clickup-integration.tsx`, `integrations-view.tsx`, `integrations-rail.tsx`, `page.tsx`)

## Schemas
- `L2-CLICKUP-01` — `clickup_config` table (single row, `kind` unique default `clickup`): `id`, `kind`, `apiTokenEnc` (AES, `L2-DB-16`), `teamId` (nullable plaintext — a workspace id, not a secret), `clientId` + `clientSecretEnc` (nullable, reserved), `enabled` (default false), `updatedAt`. Migration `0012` creates it. `db` counterpart: `L2-DB-29`. (`packages/db/src/schema.ts`)

## Invariants
- `L2-CLICKUP-05` — Token encrypted at rest, never sent to the client — masked preview only (`mask.ts`, same util as `L2-AI-06`).
- `L2-CLICKUP-06` — Blank token field on save keeps the existing token (no overwrite).
- `L2-CLICKUP-07` — `clientId`/`clientSecretEnc` are reserved for a future OAuth app and are never written or read by current code. A personal token authenticates as the ClickUp user who minted it and inherits that user's access.
- `L2-CLICKUP-08` — The connection probe only reads (`/user`, `/team`). No ClickUp state is created or changed from the settings UI.

## Errors
- `L2-CLICKUP-09` — Unauthenticated / non-`settings` caller → `{ ok: false, message: "Unauthorized" }`, no write / no fetch.
- `L2-CLICKUP-10` — Probe with no stored token → `{ ok: false, "Save an API token first." }`. Probe failure or bad token → generic `{ ok: false, "Could not reach ClickUp — check the token." }`; provider error bodies never surface to the UI.

## Acceptance
- `L2-CLICKUP-11` — Fresh DB after `db:migrate`: table exists, no row → pane shows "Not connected", Test disabled.
- `L2-CLICKUP-12` — Save a valid token → masked preview shown; Test reports the ClickUp username + workspace count; blank-token re-save keeps the token.

## Constrained L3
- `/docs/notes/clickup.md`

---
IDs: `L2-CLICKUP-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
