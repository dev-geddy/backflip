# Notes (L3) — ai

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `apps/web/app/backflip/(protected)/settings/page.tsx` — server; loads `ai_config`, maps to view model (no key decryption; `hasKey` boolean). Satisfies `L2-AI-01`.
- `settings/_components/ai-config-form.tsx` — client; Tabs per provider; `useActionState(saveAiConfig)`. Fields: model (`native-select`), API key (password, write-only), enabled + default (`Switch`, base-ui `name`). Static `MODELS` list per provider. (baseUrl/temperature columns exist but aren't in the form.)
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
