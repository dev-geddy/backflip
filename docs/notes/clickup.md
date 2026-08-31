# Notes (L3) — clickup

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `packages/db/src/schema.ts` — `clickup_config` table (`@spec L2-DB-29, L2-CLICKUP-01`). Single row keyed by `kind = "clickup"`. Satisfies `L2-CLICKUP-01`.
- `packages/db/migrations/0012_lethal_sandman.sql` — creates `clickup_config` (alongside `slack_app`, `slack_webhook`, `n8n_config`). Satisfies `L2-DB-08`.
- `apps/web/app/backflip/(protected)/settings/_lib/clickup.ts` — `fetchClickupIdentity(token)`: parallel `GET /api/v2/user` + `GET /api/v2/team`; a failing `/team` degrades to `teams: []` rather than failing the probe. `server-only`. Satisfies `L2-CLICKUP-03`.
- `settings/_actions.ts` — `saveClickupConfig` (upsert on `kind`, encrypt token when non-blank) + `testClickupConnection` (decrypt → probe → generic error copy). Satisfies `L2-CLICKUP-02`, `L2-CLICKUP-03`, `L2-CLICKUP-06`, `L2-CLICKUP-09/10`.
- `settings/_components/clickup-integration.tsx` — detail pane; `useActionState(saveClickupConfig)`; fields API token (CSS-masked text input), default workspace id, Enabled switch; Test button disabled until a token is stored. Satisfies `L2-CLICKUP-04`.
- `settings/_components/integration-test-button.tsx` — shared "Test connection" button (`useTransition` + sonner toast). Reused by n8n and both Slack lists.
- `settings/page.tsx` — reads the row, maps to `ClickupConfig` view model (`tokenPreview` only, never the token).
- `settings/_components/integrations-view.tsx` / `integrations-rail.tsx` — list row (tile `Cu`) + About copy.

## Auth choice
- Personal API token (`pk_…`), pasted by the operator. Header is `Authorization: <token>` — **no `Bearer` prefix**; ClickUp 401s if you add one.
- OAuth app deferred by decision: `clientId` / `clientSecretEnc` columns exist and stay null (`L2-CLICKUP-07`). Wiring OAuth later needs a callback route + token refresh, neither of which exists.
- Consequence worth repeating in the UI rail: a personal token inherits its creator's ClickUp access — use a service account for shared automation.

## State
- Config + probe only. No task/list/comment call sites yet (`L2-CLICKUP` "not owned").
- Verified: typecheck + lint clean, full build passes.
- Migration `0012` applied to the docker db (`backflip-db`, host port 5544) — `clickup_config` exists, no row yet (created on first save).

## TODO
- Workspace picker fed by `/team` instead of a free-text id field.
- Task-creation helper once a call site exists.
