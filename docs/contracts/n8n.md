# Contract (L2) — n8n

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-01` (admin surface), `L1-STACK-07` (Postgres config), `L1-STACK-09` (Drizzle schema + migrations)
> **Depends on L2:** `db` (`n8n_config`, `L2-DB-16` crypto), `auth` (settings gate), `ui` (Input/Switch/Field/Button)

## Owns
n8n operator config under `/backflip/settings` (backed by `n8n_config`) — one instance URL + public API key + enabled flag — plus a read-only connection probe.

Explicitly **not** owned: workflow triggering / execution call sites (none exist yet — this is config plumbing for them), and multi-instance support (single row by design, `L2-N8N-05`).

## Interfaces
- `L2-N8N-02` — Server action `saveN8nConfig(prev, formData)` + `normalizeN8nBaseUrl(input)` — upserts the single `n8n_config` row on `kind`; the URL is normalized to origin + sub-path, trailing slash dropped, non-http(s) refused. `settings`-gated. Key encrypted when supplied; blank keeps existing. (`settings/_actions.ts`, `settings/_lib/n8n.ts`)
- `L2-N8N-13` — The n8n API key uses the shared credential block (`L2-AI-23`): stored → read-only masked row with Replace and a confirmed Remove; removing nulls `apiKeyEnc` and sets `enabled = false`. The instance URL is kept, so reconnecting is one paste.
- `L2-N8N-03` — Server action `testN8nConnection()` + `fetchN8nStatus(baseUrl, apiKey)` — probe via `GET {baseUrl}/api/v1/workflows?limit=1` (`X-N8N-API-KEY`), key decrypted server-side only; returns `{hasWorkflows}` — deliberately not a count, the probe reads one row. 10s timeout, no-store. Executes nothing. (`settings/_actions.ts`, `settings/_lib/n8n.ts`)
- `L2-N8N-04` — Route `/backflip/settings` → n8n integration — eighth master-detail entry; fields: instance URL, public API key (masked, no reveal), Enabled, plus "Test connection". List row reads "connected" iff both URL and key are saved. (`settings/_components/n8n-integration.tsx`, `integrations-view.tsx`, `integrations-rail.tsx`, `page.tsx`)

## Schemas
- `L2-N8N-01` — `n8n_config` table (single row, `kind` unique default `n8n`): `id`, `kind`, `baseUrl` (nullable plaintext — an instance origin, not a secret), `apiKeyEnc` (AES, `L2-DB-16`), `enabled` (default false), `updatedAt`. Migration `0012` creates it. `db` counterpart: `L2-DB-32`. (`packages/db/src/schema.ts`)

## Invariants
- `L2-N8N-05` — One instance. Self-hosted or cloud, operator's choice; the single row is the contract, mirroring `email_config` / `speech_config`.
- `L2-N8N-06` — Key encrypted at rest, never sent to the client — masked preview only.
- `L2-N8N-07` — Blank key field on save keeps the existing key (no overwrite).
- `L2-N8N-08` — The probe only lists workflows. No workflow is executed, activated or modified from the settings UI.

## Errors
- `L2-N8N-09` — Unauthenticated / non-`settings` caller → `{ ok: false, message: "Unauthorized" }`, no write / no fetch.
- `L2-N8N-10` — Non-http(s) or unparseable instance URL → `{ ok: false, "Enter the instance URL, e.g. https://n8n.example.com." }`, no write. Probe without URL or key → `{ ok: false }` naming the missing one. Unreachable instance or bad key → generic `{ ok: false, "Could not reach n8n — check the URL and API key." }`; n8n error bodies never surface to the UI.

## Acceptance
- `L2-N8N-11` — Fresh DB after `db:migrate`: table exists, no row → pane shows "Not connected", Test disabled.
- `L2-N8N-12` — Save `https://n8n.example.com/` + a valid key → URL stored without the trailing slash, masked key preview shown, Test reports connected; blank-key re-save keeps the key.

## Constrained L3
- `/docs/notes/n8n.md`

---
IDs: `L2-N8N-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
