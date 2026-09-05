# Notes (L3) — n8n

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `packages/db/src/schema.ts` — `n8n_config` table (`@spec L2-DB-32, L2-N8N-01`). Single row keyed by `kind = "n8n"`. Satisfies `L2-N8N-01`.
- `packages/db/migrations/0012_lethal_sandman.sql` — creates `n8n_config`. Satisfies `L2-DB-08`.
- `apps/web/app/backflip/(protected)/settings/_lib/n8n.ts` — `normalizeN8nBaseUrl(input)` (origin + sub-path, trailing slash stripped, http(s) only) + `fetchN8nStatus(baseUrl, apiKey)` (`GET /api/v1/workflows?limit=1`, `X-N8N-API-KEY`). `server-only`. Satisfies `L2-N8N-02`, `L2-N8N-03`.
- `settings/_actions.ts` — `saveN8nConfig` (normalize → upsert on `kind` → encrypt key when non-blank) + `testN8nConnection`. Satisfies `L2-N8N-02`, `L2-N8N-03`, `L2-N8N-07`, `L2-N8N-09/10`.
- `settings/_components/n8n-integration.tsx` — detail pane; instance URL, API key (CSS-masked text input), Enabled switch, Test button (disabled until both URL and key are stored). Satisfies `L2-N8N-04`. The key row is the shared `CredentialField` (`L2-AI-23`): stored → masked read-only row, Replace, confirmed Remove (`L2-N8N-13`).
- `settings/page.tsx` — reads the row, maps to `N8nConfig` view model (`keyPreview` only, never the key).
- `settings/_components/integrations-view.tsx` / `integrations-rail.tsx` — list row (tile `n8`) + About copy.

## Probe shape
- `limit=1` keeps the probe cheap, which means a workflow **count** would be a lie — `fetchN8nStatus` returns `{hasWorkflows}` and the toast says "the API key can read workflows" / "no workflows on this instance yet".
- Sub-paths are preserved by `normalizeN8nBaseUrl` (n8n is often reverse-proxied under one, e.g. `https://example.com/n8n`); the `/api/v1` suffix is appended by the caller, never typed by the operator.
- The n8n public API must be enabled on the instance; a disabled API answers 404 and surfaces as the generic "Could not reach n8n" copy (`L2-N8N-10`).

## State
- Config + probe only. No workflow triggering yet (`L2-N8N` "not owned").
- Single instance by decision (`L2-N8N-05`) — Slack is the multi-row integration here, n8n follows `email_config` / `speech_config`.
- Verified: typecheck + lint clean, full build passes.
- Migration `0012` applied to the docker db (`backflip-db`, host port 5544) — `n8n_config` exists, no row yet (created on first save).

## TODO
- `triggerN8nWorkflow(id, payload)` helper once a call site exists.
- Webhook-URL storage (n8n's inbound webhooks) if the platform ever needs to be *called by* n8n rather than call it.
