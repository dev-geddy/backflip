# Contract (L2) — ai

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-01`, `L1-STACK-11`
> **Depends on L2:** `db` (`ai_config`, crypto), `auth` (admin gate)

## Owns
AI integration configuration: provider/model/key settings under `/backflip/settings`, backed by `ai_config`, plus the model-call layer (test round-trip today).

## Interfaces
- `L2-AI-01` — Route `/backflip/settings` — admin AI config UI. Tabs per provider (Anthropic, OpenAI, Google). (`apps/web/app/backflip/(protected)/settings/`)
- `L2-AI-02` — Server action `saveAiConfig(prev, formData)` — upserts one provider's config; encrypts the key if supplied; enforces a single default. Admin-gated. (`settings/_actions.ts`)
- `L2-AI-03` — Config persisted in `ai_config` (`L2-DB-17`). Keys encrypted via `L2-DB-16`.
- `L2-AI-13` — Server action `listAiModels(provider)` + `settings/_lib/provider-models.ts` — live model list from the provider's models API using the stored key (decrypted server-side; key never sent to client, only ids/labels). No key, a provider error or an empty answer → `ok:false` with a short reason, and the UI lists **nothing** (`L2-AI-24`) — there is no static catalog behind it any more.
- `L2-AI-23` — Stored credentials are **not editable fields**. Every integration pane on `/backflip/settings` renders its secret through one shared block (`settings/_components/credential-field.tsx`): with nothing stored, an input; with a key stored, a read-only masked row (`L2-AI-06`) carrying **Replace** — which opens an empty input and can be backed out of — and **Remove**, which asks for confirmation in an `AlertDialog` before calling `clearIntegrationKey(target)`. The removal nulls that integration's encrypted column **and** sets `enabled = false` (for an AI provider, `isDefault = false` too): a connection with no credential cannot work, so leaving it switched on would only mean every call site special-casing it. The rest of the row survives — model, from-address, instance URL are settings, not secrets. Targets are a closed list (`settings/_lib/credentials.ts`: `ai:anthropic` | `ai:openai` | `ai:google` | `email` | `speech` | `clickup` | `n8n`), shared by the button and the action so a pane cannot ask for a clear the action does not implement; the action re-checks `settings` itself. Slack apps/webhooks are absent by design — deleting the row is already how their token goes (`L2-SLACK-05`, `L2-SLACK-06`). Replaces the old single always-editable input whose placeholder read "leave blank to keep": it made an accidental keystroke a silent overwrite of a working credential, and left no way to remove one at all.
- `L2-AI-24` — Model lists are **live ids only**. What renders in the model select and the "Available models" list is what the provider's models API returned (`L2-AI-13`); there is no built-in catalog, and a failure renders the reason plus an empty state with a Refresh, never a plausible-looking list. The one exception is the id already saved in `ai_config`, which stays selectable, labelled `(saved)`, so a live list that omits it cannot silently re-point a working integration on the next save; it is excluded from the "N models" count, which states only what the provider vouched for. Same rule already held for Deepgram (`L2-SPEECH-06`); the AI panes now match it.
- `L2-AI-14` — Route `POST /api/backflip/ai/test` — one live round-trip via the Vercel AI SDK (`L1-STACK-11`) using the stored key, decrypted server-side. Body `{provider, model, prompt}`; response streams the answer as `text/plain` markdown chunks. Settings-gated. (`apps/web/app/api/backflip/ai/test/route.ts`, `settings/_lib/ai-test.ts`)
- `L2-AI-15` — Test modal (`settings/_components/ai-test-dialog.tsx`) — pick enabled provider → model (live list, `L2-AI-13`) → prompt textarea → submit → thinking state → response streamed into the same dialog and rendered as markdown.

## Schemas
- `L2-AI-04` — Providers: `anthropic` (default, Claude), `openai`, `google`. Extensible via the `ai_provider` enum.
- `L2-AI-05` — Per provider (UI): `model`, `apiKey` (write-only), `enabled`, `isDefault`. (`ai_config` also has `baseUrl`/`temperature` columns with defaults, not exposed in the form.)
- `L2-AI-16` — Test request: `provider` ∈ `L2-AI-04`, `model` non-empty, `prompt` 1–4000 chars. Response bounded: system prompt asks for a short, well-structured markdown answer; `maxOutputTokens` 800; 60s timeout.

## Invariants
- `L2-AI-06` — Full API keys never sent to the client. UI may show a masked preview (first 3 + last 4 chars around a fixed dot run; keys ≤8 chars fully masked) decrypted server-side. Stored encrypted (`L2-DB-16`), never plaintext.
- `L2-AI-07` — At most one `isDefault` provider (enforced in `saveAiConfig`).
- `L2-AI-08` — A save that carries no API-key value keeps the existing key (no overwrite). This is now a server-side safety net rather than a UI affordance: with a key stored the pane renders no key input at all (`L2-AI-23`), so the form has nothing to submit unless the operator explicitly chose to replace it.
- `L2-AI-17` — Only providers that are `enabled` **and** have a saved key are testable (filtered in the modal, re-checked server-side).
- `L2-AI-18` — Test calls never send the key to the client; provider error bodies are never surfaced (generic message only), same as `L2-AI-13`.
- `L2-AI-22` _(inv)_ — `POST /api/backflip/ai/test` is per-user rate limited: 20 runs / 5 min keyed on `session.user.id`; over-limit → 429 + `Retry-After`, no provider call. Bounds cost abuse of the org's stored provider key (owner-gated but otherwise unmetered). In-process limiter (`_lib/rate-limit.ts`, shared with `L2-AUTH-40`) — per Node process.

## Errors
- `L2-AI-09` — Unauthenticated `saveAiConfig` → `{ ok: false, "Unauthorized" }`, no write.
- `L2-AI-10` — Missing `ENCRYPTION_KEY` → encrypt/decrypt throws (`L2-DB-16`).
- `L2-AI-19` — `POST /api/backflip/ai/test` unauthenticated → 401; lacking `settings` → 403. No provider call.
- `L2-AI-20` — Disabled provider / no key / blank or over-long prompt / unknown provider → 400, no provider call. Provider call failure → 502 with a generic message.

## Acceptance
- `L2-AI-11` — Saving a provider persists model/params; key round-trips (encrypt→decrypt) and is masked in UI.
- `L2-AI-25` — With a key stored the pane shows no key input, a masked row, Replace and Remove; Remove confirms first, then leaves the pane back in its "paste a key" state with the provider switched off. A key the provider rejects lists no models anywhere in the pane. Covered by `e2e/integration-credentials.spec.ts` and `settings/_actions.test.ts`.
- `L2-AI-12` — Setting one provider default unsets the others.
- `L2-AI-21` — Enabled provider + key + prompt → answer streams into the modal and renders as markdown; providers that aren't testable are absent from the picker; failures show a generic error, not a stack or provider body.

## Constrained L3
- `/docs/notes/ai.md`

---
IDs: `L2-AI-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
