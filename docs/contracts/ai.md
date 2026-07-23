# Contract (L2) — ai

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-01`, `L1-STACK-11`
> **Depends on L2:** `db` (`ai_config`, crypto), `auth` (admin gate)

## Owns
AI integration configuration: provider/model/key settings under `/backflip/settings`, backed by `ai_config`. (Model calls: future.)

## Interfaces
- `L2-AI-01` — Route `/backflip/settings` — admin AI config UI. Tabs per provider (Anthropic, OpenAI, Google). (`apps/web/app/backflip/(protected)/settings/`)
- `L2-AI-02` — Server action `saveAiConfig(prev, formData)` — upserts one provider's config; encrypts the key if supplied; enforces a single default. Admin-gated. (`settings/_actions.ts`)
- `L2-AI-03` — Config persisted in `ai_config` (`L2-DB-17`). Keys encrypted via `L2-DB-16`.

## Schemas
- `L2-AI-04` — Providers: `anthropic` (default, Claude), `openai`, `google`. Extensible via the `ai_provider` enum.
- `L2-AI-05` — Per provider (UI): `model`, `apiKey` (write-only), `enabled`, `isDefault`. (`ai_config` also has `baseUrl`/`temperature` columns with defaults, not exposed in the form.)

## Invariants
- `L2-AI-06` — API keys never sent to the client; UI shows only whether a key is set. Stored encrypted (`L2-DB-16`), never plaintext.
- `L2-AI-07` — At most one `isDefault` provider (enforced in `saveAiConfig`).
- `L2-AI-08` — Blank API-key field on save keeps the existing key (no overwrite).

## Errors
- `L2-AI-09` — Unauthenticated `saveAiConfig` → `{ ok: false, "Unauthorized" }`, no write.
- `L2-AI-10` — Missing `ENCRYPTION_KEY` → encrypt/decrypt throws (`L2-DB-16`).

## Acceptance
- `L2-AI-11` — Saving a provider persists model/params; key round-trips (encrypt→decrypt) and is masked in UI.
- `L2-AI-12` — Setting one provider default unsets the others.

## Constrained L3
- `/docs/notes/ai.md`

---
IDs: `L2-AI-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
