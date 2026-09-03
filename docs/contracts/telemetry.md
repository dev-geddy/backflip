# Contract (L2) — telemetry

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-01` (public ingest surface, admin-only display), `L1-ARCH-03` (admin reads server-side; the route exists for a consumer outside the app), `L1-CON-03` (generic, opt-out-able), `L1-STACK-07`/`L1-STACK-09` (Postgres + Drizzle)
> **Depends on L2:** `db` (`telemetry_install`, `telemetry_start`), `auth` (`settings` capability gates the display), `ui` (chart primitives), `devops` (edge rate-limit zone)

## Owns
Anonymous "someone started this project" reporting: the client script hooked into `yarn dev`, the unauthenticated ingest endpoint, the two telemetry tables, the adoption cards on the admin Overview, the install manager behind them, and the retention policy for event rows.

Explicitly **not** owned: page-view analytics on the public site (that is `analytics`, Google Analytics, browser-side and consent-gated), any per-user or per-session tracking, and any public display of these figures.

## Interfaces
- `L2-TELEMETRY-09` — Route `POST /api/public/telemetry/start` — unauthenticated. Accepts one JSON start report. Answers `204` with an empty body for every outcome (recorded, malformed, over-budget, ingest disabled) and `429` + `Retry-After` only when the per-IP burst budget is spent. Never returns data, never sets CORS headers. `runtime = "nodejs"`, `dynamic = "force-dynamic"`. (`apps/web/app/api/public/telemetry/start/route.ts`)
- `L2-TELEMETRY-10` — Client `scripts/track-start.mjs` — plain Node ESM, zero dependencies, run from the root `dev` script as `node scripts/track-start.mjs & turbo dev`. One POST, 1.5s timeout, every error swallowed. Reads `.env`/`.env.local` itself (it runs beside dotenv-cli, not inside it).
- `L2-TELEMETRY-07` — `recordStart({ report, ip, allowNewInstall })` → `"disabled" | "created" | "bumped" | "throttled" | "ignored" | "budget"`. The only writer of both tables. (`apps/web/app/_lib/telemetry/record.ts`)
- `L2-TELEMETRY-08` — `getTelemetrySummary(now?)` → `TelemetrySummary` — 30-day daily series (zero-filled), window unique/total, previous-window unique/total, returning installs, `hasData`. Server-only. (`apps/web/app/_lib/telemetry/queries.ts`)
- `L2-TELEMETRY-12` — `<TelemetryCards summary />` on `/backflip` — two cards, each a figure plus its own chart: unique installs (area) and total starts (bar), both over 30 days. Rendered only for roles holding `settings`. (`(protected)/_components/telemetry-cards.tsx`, `(protected)/page.tsx`)
- `L2-TELEMETRY-05` — Per-IP budgets, split by effect: burst 5/min (any request), daily 60/day (accepted reports), new-install 3/day (spent only when a report actually creates an install row). In-process, same store as every other limiter. IP resolved by `clientIp` (`apps/web/app/_lib/client-ip.ts`, shared with `L2-MCP-30`). (`apps/web/app/_lib/telemetry/limits.ts`)
- `L2-TELEMETRY-06` — `parseStartReport(input, current?)` — strict zod object `{ installId: uuid, appVersion: semver, platform: enum, nodeMajor: 18..40 }` plus the version-plausibility check. Unknown fields reject the report. (`apps/web/app/_lib/telemetry/payload.ts`)
- `L2-TELEMETRY-33` — `getTelemetryInstalls(limit = 50)` → `TelemetryInstallRow[]` — installs by `lastSeenAt` desc, ignored rows included. Exposes only the first 8 chars of `installIdHash`. Server-only. (`apps/web/app/_lib/telemetry/queries.ts`)
- `L2-TELEMETRY-34` — Server action `setTelemetryInstallIgnored(id, ignored)` → `{ ok, message } | null` — flips `telemetry_install.ignored`, `settings`-gated, revalidates `/backflip`. Reversible; nothing is deleted. (`(protected)/_actions.ts`)
- `L2-TELEMETRY-35` — `<TelemetryInstalls installs />` — collapsed-by-default drawer under the cards; one row per install (short hash, platform, version, starts, active days, last seen) with an optimistic switch. Renders nothing when there are no installs. (`(protected)/_components/telemetry-installs.tsx`)
- `L2-TELEMETRY-32` — `maybePruneOldStarts(now?)` → deleted count, or null when skipped — deletes `telemetry_start` rows older than `retentionCutoff(now)`. Triggered fire-and-forget from an accepted ingest write, at most once per `PRUNE_MIN_INTERVAL_MS` (24h) per process. No scheduler. (`apps/web/app/_lib/telemetry/retention.ts`)
- `L2-TELEMETRY-04` — `telemetryHash(domain, value)` — HMAC-SHA256 under `TELEMETRY_HASH_SALT`, hex, truncated to 32 chars, domain-separated (`install` / `ip`). Returns null when no salt is set. (`apps/web/app/_lib/telemetry/config.ts`)

## Schemas
- `L2-TELEMETRY-01` — `telemetry_install` — one row per known install: `id`, `installIdHash` (unique), `firstSeenAt`, `lastSeenAt`, `startCount`, `activeDays`, `lastActiveDay` (`YYYY-MM-DD` UTC), `appVersion`, `platform`, `nodeMajor`, `ignored`. Dedupe + budget anchor. `db` counterpart: `L2-DB-34`.
- `L2-TELEMETRY-02` — `telemetry_start` — one row per counted start: `id`, `installIdHash`, `ipHash` (nullable), `appVersion`, `platform`, `createdAt`. Indexed on `createdAt` and `installIdHash`. The only source the dashboard reads. `db` counterpart: `L2-DB-35`.
- `L2-TELEMETRY-31` — Retention: `telemetry_start` rows are kept `START_RETENTION_DAYS` = 400 days (a year plus margin, so year-over-year is always available). `telemetry_install` is never pruned — its all-time `startCount` is the durable record, so pruning forgets *when* an install ran, never *that* it exists. Constants live in `config.ts`; `retentionCutoff(now, days?)` is the pure date helper.
- `L2-TELEMETRY-03` — Env: `TELEMETRY_HASH_SALT` (server, ingest key — no default), `BACKFLIP_TELEMETRY` (client, `off`/`false`/`0` opts out), `BACKFLIP_TELEMETRY_ENDPOINT` (client, endpoint override; default `https://backflip.dev-geddy.com/api/public/telemetry/start`). All three declared in `turbo.json` `globalEnv`.

## Invariants
- `L2-TELEMETRY-11` — **Two defaults, opposite directions.** Sending is ON by default (a starter learns nothing about its own use otherwise) and opt-out in one line. Receiving is OFF by default: with no `TELEMETRY_HASH_SALT` the endpoint answers normally and stores nothing, so a fork never collects data by accident.
- `L2-TELEMETRY-13` — **Raw identifiers are never persisted.** The install id and the source IP exist only in memory, and reach the database exclusively as `telemetryHash` output. Neither is logged. Rotating the salt unlinks every prior hash — accepted cost, it is also the privacy property.
- `L2-TELEMETRY-14` — **Minimal payload.** Exactly four fields, all machine facts. No hostname, username, path, git remote, env value, or project content is collected — and the strict schema means adding a field is a deliberate contract change, not an accident.
- `L2-TELEMETRY-15` — **Telemetry never breaks the dev server.** The client is backgrounded, time-boxed, and swallows every error; offline or endpoint-down is indistinguishable from success on the client side.
- `L2-TELEMETRY-16` — **No proof of authenticity is claimed.** The client ships in a public repo and holds no secret, so the endpoint cannot verify that a report is genuine. Defense is layered cost (`L2-TELEMETRY-05`, `L2-TELEMETRY-06`, `L2-TELEMETRY-17`) plus recoverability (`L2-TELEMETRY-18`) — never an assertion that the numbers are unforgeable. Proof-of-work is a deliberate non-goal at this stage.
- `L2-TELEMETRY-17` — **Per-install ceilings.** One install counts at most one start per 60s and 20 per UTC day. Over-ceiling reports are accepted and dropped.
- `L2-TELEMETRY-18` — **Every stored row stays attributable to an install that can be disowned.** Setting `telemetry_install.ignored` removes that install from every figure retroactively, which is what makes an unauthenticated counter tolerable: bad data can be removed after the fact. The maintainer's own machines use `BACKFLIP_TELEMETRY=off`; `ignored` is the backstop for the ones that slipped through, and it is toggled from the install manager (`L2-TELEMETRY-35`), not by hand in SQL.
- `L2-TELEMETRY-19` — **Display is admin-only** (`L1-ARCH-01`). No public page, and no public read endpoint exists — the ingest route is write-only. The dashboard reads the tables server-side (`L1-ARCH-03`).
- `L2-TELEMETRY-20` — **Figures come from `telemetry_start`, never from the `telemetry_install` aggregate.** The aggregate is throttling state; a counter must not be rendered from the number its own rate limiter mutates.
- `L2-TELEMETRY-21` — Days are UTC calendar days everywhere — ingest ceilings, `activeDays`, and chart buckets — so one report is counted in exactly one bucket regardless of where it came from.

## Errors
- `L2-TELEMETRY-22` — Malformed body, wrong content type, oversized body, implausible version, exhausted daily/new-install budget, ignored install, `ignored` deployment with no salt → `204`, no body, nothing written. Silent by design: a prober learns nothing about which rule it tripped.
- `L2-TELEMETRY-23` — Burst budget exhausted → `429` with `Retry-After` in seconds. The one condition worth telling an honest client about.
- `L2-TELEMETRY-24` — Database failure during ingest → still `204`. A telemetry write must never surface to a dev server that is only trying to start.
- `L2-TELEMETRY-25` — Database failure during dashboard read → the Adoption section is omitted; the rest of the Overview renders. No error surface for a panel nobody's work depends on.

## Acceptance
- `L2-TELEMETRY-26` — Fresh DB, salt set: `POST` a valid report → one `telemetry_install` row and one `telemetry_start` row, both carrying hashes rather than the posted uuid or the caller's IP. Repeating within 60s adds nothing. The sixth request in a minute answers `429`.
- `L2-TELEMETRY-27` — No `TELEMETRY_HASH_SALT`: the same request answers `204` and both tables stay empty.
- `L2-TELEMETRY-28` — `BACKFLIP_TELEMETRY=off` in `.env.local`: `yarn dev` makes no network call and creates no `.backflip/install-id`.
- `L2-TELEMETRY-29` — Owner on `/backflip` sees both cards with 30-day figures, deltas against the previous 30 days, and a chart each; a teammate sees no Adoption section. With no data, both cards read "Nothing reported yet".
- `L2-TELEMETRY-36` — Owner opens **Manage installs**, switches one install off → both figures drop by that install's contribution on reload, the row stays visible and dimmed, and switching it back on restores them. A failed write reverts the switch and toasts.
- `L2-TELEMETRY-37` — A `telemetry_start` row older than the retention window is gone after the next accepted ingest write in a process that has not swept for 24h; its `telemetry_install` row is untouched.
- `L2-TELEMETRY-30` — Unit suites cover hashing (stability, domain separation, salt rotation, no raw value) payload validation (strict fields, version ceiling), and the retention cutoff (window, leap/year boundaries): `apps/web/app/_lib/telemetry/*.test.ts`.

## Constrained L3
- `/docs/notes/telemetry.md`

---
IDs: `L2-TELEMETRY-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
