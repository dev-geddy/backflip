# Notes (L3) — ai

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `apps/web/app/backflip/(protected)/settings/page.tsx` — server; loads `ai_config`, maps to view model (no key decryption; `hasKey` boolean). Satisfies `L2-AI-01`.
- `settings/_components/ai-config-form.tsx` — client; Tabs per provider (provider selector), flat form content (no Card), inputs capped 320px. `useActionState(saveAiConfig)`. Fields: **default model** (`native-select`; per-provider default, individual AI features may request a different model at call time), API key (password, write-only), enabled + default provider (`Switch`, base-ui `name`). Static `MODELS` list per provider. (baseUrl/temperature columns exist but aren't in the form.) Page wraps each settings section in a `Card`. `ai-section.tsx` (client) toggles between a **summary** (per-provider status: default/enabled badges, model, masked key preview, or "Not configured" + "Edit settings" button) and the **edit** view (two-column: `AiConfigForm` left, vertical `Separator`, explanation prose right). Form takes `onSaved`/`onCancel`; on save success (`state.ok`) it returns to summary. Provider name shown as a title above the form.
- `settings/_lib/mask.ts` — server util: `keyPreview(apiKeyEnc)` decrypts (`L2-DB-16`) → `maskKey` (first 3 + last 4 around fixed 8-dot run; ≤8 chars fully masked). Preview computed in `page.tsx`; plaintext never sent to client. Satisfies `L2-AI-06`.
- `settings/_actions.ts` — `saveAiConfig` (`"use server"`): auth-gate → upsert on provider → encrypt key if provided → unset other defaults → `revalidatePath`. Satisfies `L2-AI-02`, `L2-AI-06..08`. Also `listAiModels(provider)`: auth-gate → read `ai_config` row → decrypt key server-side → `fetchProviderModels` → `{ok, models}` (or `ok:false` when no key / fetch fails — UI keeps fallback). Satisfies `L2-AI-13` (proposed).
- `settings/_lib/provider-models.ts` — server-only live model discovery (`@spec L2-AI-13`): anthropic `GET /v1/models` (x-api-key + anthropic-version, `after_id` pagination ≤5 pages), openai `GET /v1/models` (Bearer; filtered to chat families `gpt-*`/`o<N>`/`chatgpt-*`, non-chat variants excluded), google `GET v1beta/models` (x-goog-api-key, `generateContent`-capable only, `models/` prefix stripped, pageToken ≤5 pages). 10s timeout, provider error bodies never surfaced to the client.
- `ai-integration.tsx` model UI: `useProviderModels` hook — static `MODELS` fallback immediately, then live list via `listAiModels` when a key is saved; saved model always kept selectable; dropdown disabled while loading; "Available models" panel labels live vs suggestions, scrolls past 72.
- `apps/web` dep `server-only` — guards `provider-models.ts` from client bundling.
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
