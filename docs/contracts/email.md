# Contract (L2) — email

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-01`
> **Depends on L2:** `db` (`email_config`, crypto), `auth` (admin gate)

## Owns
Email sending configuration: Resend provider config under `/backflip/settings` (Email section), backed by `email_config`. (Sending calls: future.)

## Interfaces
- `L2-EMAIL-01` — Route `/backflip/settings` Email section — admin Resend config UI (flat form). (`apps/web/app/backflip/(protected)/settings/`)
- `L2-EMAIL-02` — Server action `saveEmailConfig(prev, formData)` — upserts the single `email_config` row; encrypts the key if supplied. Admin-gated. (`settings/_actions.ts`)
- `L2-EMAIL-03` — Config persisted in `email_config` (`L2-DB-18`). Key encrypted via `L2-DB-16`.

## Schemas
- `L2-EMAIL-04` — Provider: `resend` (fixed, single row). Extensible later.
- `L2-EMAIL-05` — Fields (UI): `apiKey` (write-only), `fromEmail`, `fromName`, `replyTo`, `enabled`.

## Invariants
- `L2-EMAIL-06` — API key never sent to the client; UI shows only whether a key is set. Stored encrypted (`L2-DB-16`), never plaintext.
- `L2-EMAIL-07` — Blank API-key field on save keeps the existing key (no overwrite).

## Errors
- `L2-EMAIL-08` — Unauthenticated `saveEmailConfig` → `{ ok: false, "Unauthorized" }`, no write.
- `L2-EMAIL-09` — Missing `ENCRYPTION_KEY` → encrypt/decrypt throws (`L2-DB-16`).

## Acceptance
- `L2-EMAIL-10` — Saving persists from/reply-to/enabled; key round-trips (encrypt→decrypt) and is masked in UI.

## Constrained L3
- `/docs/notes/email.md`

---
IDs: `L2-EMAIL-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
