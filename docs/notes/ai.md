# Notes (L3) — ai

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `apps/web/app/backflip/(protected)/settings/page.tsx` — server; loads `ai_config`, maps to view model (no key decryption; `hasKey` boolean). Satisfies `L2-AI-01`.
- `settings/_components/ai-config-form.tsx` — client; Tabs per provider (provider selector), flat form content (no Card), inputs capped 320px. `useActionState(saveAiConfig)`. Fields: **default model** (`native-select`; per-provider default, individual AI features may request a different model at call time), API key (password, write-only), enabled + default provider (`Switch`, base-ui `name`). Static `MODELS` list per provider. (baseUrl/temperature columns exist but aren't in the form.) Page wraps each settings section in a `Card`. `ai-section.tsx` (client) toggles between a **summary** (per-provider status: default/enabled badges, model, masked key preview, or "Not configured" + "Edit settings" button) and the **edit** view (two-column: `AiConfigForm` left, vertical `Separator`, explanation prose right). Form takes `onSaved`/`onCancel`; on save success (`state.ok`) it returns to summary. Provider name shown as a title above the form.
- `settings/_lib/mask.ts` — server util: `keyPreview(apiKeyEnc)` decrypts (`L2-DB-16`) → `maskKey` (first 3 + last 4 around fixed 8-dot run; ≤8 chars fully masked). Preview computed in `page.tsx`; plaintext never sent to client. Satisfies `L2-AI-06`.
- `settings/_actions.ts` — `saveAiConfig` (`"use server"`): auth-gate → upsert on provider → encrypt key if provided → unset other defaults → `revalidatePath`. Satisfies `L2-AI-02`, `L2-AI-06..08`.
- `packages/db` — `ai_config` table + `encryptSecret`/`decryptSecret` (`L2-DB-16/17`).

## State
- Scope = config + persistence only. No model calls yet; AI SDK (`ai`, `@ai-sdk/*`) not installed until calls land.
- Nav: Settings (secondary group) → `/backflip/settings`.
- Verified: settings renders; ai_config insert + key encrypt/decrypt round-trip pass.

## Models offered (static, tune freely)
- anthropic: `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`
- openai: `gpt-4.1`, `gpt-4o`, `o3`, `o4-mini`
- google: `gemini-2.5-pro`, `gemini-2.5-flash`

## TODO
- Install AI SDK + provider packages; build a call layer that reads the default `ai_config` (decrypt key server-side) → `generateText`/`streamText`.
- "Test connection" action (one live round-trip) — deferred.
