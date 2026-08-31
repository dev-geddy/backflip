# Contract (L2) — slack

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-01` (admin surface), `L1-STACK-07` (Postgres config), `L1-STACK-09` (Drizzle schema + migrations)
> **Depends on L2:** `db` (`slack_app`, `slack_webhook`, `L2-DB-16` crypto), `auth` (settings gate), `ui` (Table/Dialog/AlertDialog/Input/Switch/Badge)

## Owns
Slack credentials under `/backflip/settings`, in two independent multi-row lists:
- **Apps** — any number of Slack apps, each with its own bot token (`xoxb-…`) and optional signing secret.
- **Incoming webhooks** — any number of post-only `hooks.slack.com` URLs.

Both lists support add / edit / test / remove per row.

Explicitly **not** owned: message-sending call sites in app code (none exist yet), Slack event/interactivity endpoints (the signing secret is stored for them, unused today), and Slack OAuth install flow (tokens are pasted by the operator).

## Interfaces
- `L2-SLACK-03` — Server actions `saveSlackApp(prev, formData)` (create when `id` absent, update when present) + `deleteSlackApp(id)` — `settings`-gated. Bot token required on create; `xoxb-` prefix enforced. (`settings/_actions.ts`, UI `settings/_components/slack-apps.tsx`)
- `L2-SLACK-04` — Server actions `saveSlackWebhook(prev, formData)` + `deleteSlackWebhook(id)` — `settings`-gated. URL required on create and validated against `https://hooks.slack.com/services/…` (`isSlackWebhookUrl`). (`settings/_actions.ts`, UI `settings/_components/slack-webhooks.tsx`)
- `L2-SLACK-05` — Server action `testSlackApp(id)` + `slackAuthTest(botToken)` — `POST https://slack.com/api/auth.test` (`Authorization: Bearer`), token decrypted server-side only. On success stores `teamName`, `appId`, `lastCheckedAt`. Read-only in Slack — nothing is posted. 10s timeout. (`settings/_actions.ts`, `settings/_lib/slack.ts`)
- `L2-SLACK-06` — Server action `testSlackWebhook(id)` + `postSlackWebhook(url, text)` — **posts a real message** to the webhook's channel; Slack gives incoming webhooks no read API, so delivery is the only possible check. Operator-triggered only, never automatic; the UI states this before the action. Stores `lastCheckedAt` on success. (`settings/_actions.ts`, `settings/_lib/slack.ts`)
- `L2-SLACK-08` — Route `/backflip/settings` → Slack integration — seventh master-detail entry; a list pane, not a form: status header + Apps table + Webhooks table, each row with Test / Edit / Remove. List row reads "connected" iff any app or webhook row exists. (`settings/_components/slack-integration.tsx`, `integrations-view.tsx`, `integrations-rail.tsx`, `page.tsx`)

## Schemas
- `L2-SLACK-01` — `slack_app` table (many rows): `id`, `name` (unique), `botTokenEnc` (AES, `L2-DB-16`), `signingSecretEnc` (AES, nullable), `defaultChannel`, `teamName` + `appId` (display metadata from `auth.test`), `enabled` (default true), `lastCheckedAt`, `createdAt`, `updatedAt`. Migration `0012` creates it. `db` counterpart: `L2-DB-30`. (`packages/db/src/schema.ts`)
- `L2-SLACK-02` — `slack_webhook` table (many rows): `id`, `label` (unique), `urlEnc` (AES, not null — the whole URL is the credential), `channel` (operator note only), `enabled` (default true), `lastCheckedAt`, `createdAt`, `updatedAt`. Migration `0012` creates it. `db` counterpart: `L2-DB-31`. (`packages/db/src/schema.ts`)

## Invariants
- `L2-SLACK-07` — Blank secret field on update keeps the stored value (bot token, signing secret, webhook URL). Create requires the secret.
- `L2-SLACK-09` — Bot tokens, signing secrets and webhook URLs are encrypted at rest and never sent to the client. Rows carry masked previews only: tokens via `maskKey`, webhook URLs via `urlPreview` (host + masked path tail — enough to tell two webhooks apart, never enough to post).
- `L2-SLACK-10` — `slack_app.name` and `slack_webhook.label` are unique; a clashing save is refused with a message, not a 500.
- `L2-SLACK-11` — A webhook URL must be `https://hooks.slack.com/services/…`. No other host is storable — the value is used as a POST target.

## Errors
- `L2-SLACK-12` — Unauthenticated / non-`settings` caller → `{ ok: false, message: "Unauthorized" }`, no write / no fetch.
- `L2-SLACK-13` — `auth.test` rejection (Slack answers HTTP 200 with `ok:false`) → `{ ok: false, "Slack rejected the token." }`. Webhook post failure → `{ ok: false, "Slack rejected the webhook URL." }`. Slack error bodies never surface to the UI.

## Acceptance
- `L2-SLACK-14` — Fresh DB after `db:migrate`: both tables exist, both lists render their empty state, Slack list row reads "Not configured".
- `L2-SLACK-15` — Add two apps and two webhooks → all four rows persist and list independently; Test on an app fills in the workspace name; Test on a webhook delivers one message to its channel; Remove deletes only that row.

## Constrained L3
- `/docs/notes/slack.md`

---
IDs: `L2-SLACK-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
