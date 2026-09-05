# Notes (L3) — slack

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `packages/db/src/schema.ts` — `slack_app` (`@spec L2-DB-30, L2-SLACK-01`) + `slack_webhook` (`@spec L2-DB-31, L2-SLACK-02`). Many rows each; `name` / `label` unique.
- `packages/db/migrations/0012_lethal_sandman.sql` — creates both tables. Satisfies `L2-DB-08`.
- `apps/web/app/backflip/(protected)/settings/_lib/slack.ts` — `slackAuthTest(botToken)` (`POST /api/auth.test`), `postSlackWebhook(url, text)`, `isSlackWebhookUrl(url)`. `server-only`. Satisfies `L2-SLACK-05`, `L2-SLACK-06`, `L2-SLACK-11`.
- `settings/_actions.ts` — `saveSlackApp` / `deleteSlackApp` / `testSlackApp`, `saveSlackWebhook` / `deleteSlackWebhook` / `testSlackWebhook`. Create-vs-update keys off a hidden `id` field. Satisfies `L2-SLACK-03/04/05/06/07/10/12/13`.
- `settings/_components/slack-apps.tsx` — apps table + add/edit dialog + delete confirm (`AlertDialog`) + per-row Test. `SlackAppRow` type lives here. Satisfies `L2-SLACK-03`.
- `settings/_components/slack-webhooks.tsx` — same shape for webhooks; Test button reads "Send test". `SlackWebhookRow` type lives here. Satisfies `L2-SLACK-04`.
- `settings/_components/slack-integration.tsx` — pane shell: status header + both lists, separated by a rule. Satisfies `L2-SLACK-08`.
- `settings/_lib/mask.ts` — `urlPreview(urlEnc)` added here for webhook URLs (host + `…` + masked path tail); `keyPreview` reused for bot tokens. Satisfies `L2-SLACK-09`.
- `settings/page.tsx` — loads both tables ordered by `createdAt`, maps to row view models (previews only, `hasSigningSecret` boolean instead of the secret).

## Two credential kinds, on purpose
- **Bot token** (`xoxb-…`) — posts as the app anywhere it is invited, reads what its scopes allow. Verifiable without side effects (`auth.test`), so its Test is safe to click repeatedly.
- **Incoming webhook** — one post-only URL, bound by Slack to one channel. There is **no read API**: the only verification is delivering a message. So `testSlackWebhook` genuinely posts, and the section copy + button label ("Send test") say so before the click.
- Slack answers `auth.test` with HTTP 200 even on failure — `ok:false` + an `error` code is the real status. `slackAuthTest` checks the body, not the status.
- A webhook responds with the literal body `ok`; anything else (e.g. `no_service`) is an error. `postSlackWebhook` compares the trimmed text.

## Edit semantics
- Dialogs are keyed (`key={editing?.id ?? "create"}`) so `useActionState` resets between rows — otherwise a stale error message from one row would follow you to the next.
- Blank secret field on update = keep stored (`L2-SLACK-07`). The bot token and webhook URL no longer expose an editable input at all once stored: both render the shared `CredentialField` (`L2-AI-23`, `L2-SLACK-16`) — masked row + Replace, no Remove (deleting the row is the removal). The signing secret still uses the blank-keeps placeholder, having only a stored/not-stored flag to show.
- Unique-constraint violations on `name` / `label` are caught and returned as a message (`L2-SLACK-10`) — the insert/update is wrapped in try/catch rather than pre-checked, so two concurrent saves can't slip through a check-then-write gap.

## State
- Credentials + probes only. No app code sends Slack messages yet; `signingSecretEnc` is stored for a future events/interactivity endpoint and read by nothing.
- Verified: typecheck + lint clean, full build passes.
- Migration `0012` applied to the docker db (`backflip-db`, host port 5544) — `slack_app` + `slack_webhook` exist, both empty.

## TODO
- `sendSlackMessage(appId, channel, text)` send layer, mirroring `_lib/email/send.tsx`, once a call site exists.
- Slack OAuth install flow (would replace pasted tokens and fill `appId`/`teamName` at install time).
- Verify inbound Slack requests with the stored signing secret when an events endpoint lands.
