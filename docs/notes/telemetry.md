# Notes (L3) — telemetry

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `packages/db/src/schema.ts` — `telemetryInstall` + `telemetryStart`. Satisfies `L2-TELEMETRY-01`, `L2-TELEMETRY-02`, `L2-DB-34`, `L2-DB-35`.
- `packages/db/migrations/0017_curved_inhumans.sql` — drizzle-kit generated; both tables + two indexes on `telemetry_start`.
- `apps/web/instrumentation.ts` — Next `register()` hook; on the Node runtime (not during `next build`) dynamic-imports the sender and fires it un-awaited. Satisfies `L2-TELEMETRY-10`, `L2-TELEMETRY-15`.
- `apps/web/app/_lib/telemetry/report-start.ts` — the sender: opt-out check, install-id resolution (`dbStore` → `fileStore` → random), one POST. Satisfies `L2-TELEMETRY-10`, `L2-TELEMETRY-11`, `L2-TELEMETRY-15`, `L2-TELEMETRY-38`.
- `packages/db/migrations/0020_whole_paper_doll.sql` — drizzle-kit generated; `telemetry_identity`. Satisfies `L2-TELEMETRY-39`, `L2-DB-38`.
- `apps/web/app/_lib/telemetry/config.ts` — salt lookup, `telemetryHash`, `utcDay`, the four tuning constants. Satisfies `L2-TELEMETRY-03`, `L2-TELEMETRY-04`.
- `apps/web/app/_lib/telemetry/payload.ts` — strict zod schema + `plausibleVersion`. Satisfies `L2-TELEMETRY-06`.
- `apps/web/app/_lib/telemetry/limits.ts` — the three budgets. Satisfies `L2-TELEMETRY-05`.
- `apps/web/app/_lib/telemetry/record.ts` — the only writer. Satisfies `L2-TELEMETRY-07`, `L2-TELEMETRY-17`, `L2-TELEMETRY-21`.
- `apps/web/app/_lib/telemetry/queries.ts` — the only reader: `getTelemetrySummary` (cards) + `getTelemetryInstalls` (manager). Satisfies `L2-TELEMETRY-08`, `L2-TELEMETRY-20`, `L2-TELEMETRY-33`.
- `apps/web/app/api/public/telemetry/start/route.ts` — ingest. Satisfies `L2-TELEMETRY-09`, `L2-TELEMETRY-22/23/24`.
- `apps/web/app/_lib/telemetry/retention.ts` — the sweep + its in-process 24h throttle; the cutoff maths lives in `config.ts` so it stays testable. Satisfies `L2-TELEMETRY-31`, `L2-TELEMETRY-32`.
- `apps/web/app/backflip/(protected)/_actions.ts` — `setTelemetryInstallIgnored`, `settings`-gated, revalidates `/backflip`. Satisfies `L2-TELEMETRY-34`.
- `apps/web/app/backflip/(protected)/_components/telemetry-cards.tsx` — the two cards. Satisfies `L2-TELEMETRY-12`.
- `apps/web/app/backflip/(protected)/_components/telemetry-installs.tsx` — the install manager drawer. Satisfies `L2-TELEMETRY-35`.
- `apps/web/app/backflip/(protected)/page.tsx` — gates on `canAccessSettings`, `.catch(() => null)` around the read. Satisfies `L2-TELEMETRY-19`, `L2-TELEMETRY-25`.
- `apps/web/app/_lib/client-ip.ts` — `clientIp`, moved up from `_lib/oauth/limits.ts` (which re-exports it) when a second surface needed it. Shared by `L2-MCP-30` and `L2-TELEMETRY-05`.
- `devops/nginx/backflip-http.conf` / `backflip.conf` — `backflip_telemetry` zone (5r/m) + the `location = /api/public/telemetry/start` block with `client_max_body_size 2k`. Satisfies `L2-DEVOPS-27`.
- `apps/web/app/_lib/telemetry/{config,payload,retention-cutoff,report-start}.test.ts` — unit suites. Satisfies `L2-TELEMETRY-30`.
- `.env.example`, `README.md` (§ Anonymous usage telemetry) — the disclosure and the env vars.

## Why budgets are spent by effect, not per request
The two figures are not equally worth forging. Inflating *total starts* buys an attacker a bigger number on a private dashboard; inflating *unique installs* fakes adoption, which is the only claim these numbers actually make. So the route checks the burst budget first (cheap, before the body is read), then lets `recordStart` report whether the write created a row, and only *then* spends new-install budget. A caller who has run out of new-install budget still gets their existing install counted — the tight budget throttles the expensive effect without punishing an honest developer on a shared address.

Consequence to keep in mind: the daily budgets live in memory and reset on deploy. That is why the nginx zone exists (`L2-DEVOPS-27`) — it is the half that survives a restart. The Caddy flavour has no equivalent, same known gap as `/api/oauth/*` (`L2-DEVOPS-26`).

## Why there is no proof-of-work
It was designed and deliberately deferred (`L2-TELEMETRY-16`). A challenge endpoint plus hashcash would make forged installs cost CPU, which is the only real defense available when the client can hold no secret. It was cut for now because the layered budgets plus per-install ceilings already price out the realistic attacker (a curl loop), and the honest cost — a few hundred ms on every `yarn dev` — is charged to every user to defend a number only the maintainer sees. If the counter is ever displayed publicly, revisit this first.

## Why "returning installs" instead of filtering the headline
An earlier design counted only installs seen on ≥2 distinct days, so a one-shot forged install would never appear. It was dropped because it also hides *genuine* first-day installs, which undercounts exactly the signal the project cares about. Instead `activeDays >= 2` is surfaced as a footnote on the unique card: the headline stays honest about what was reported, and the footnote is the figure to trust when the headline looks surprising.

## Chart choices
- Two cards, not one dual-series chart: uniques and starts differ by roughly an order of magnitude, so a shared Y axis flattens uniques into the baseline.
- `isAnimationActive={false}` on both marks — the grow-in animation delays the reading and also produced half-drawn charts in the screenshot pipeline (Playwright's `animations: "disabled"` only freezes CSS, not Recharts' JS animation).
- The area chart's `XAxis` carries `padding={{ left: 14, right: 8 }}`; bars sit inside their band and clear the card edge on their own, a line starts flush at the axis and clips its first tick without it.
- `YAxis` is deliberately absent. The number above the chart is the value; the chart is shape.
- Days are formatted from `${day}T12:00:00Z` — midday UTC, so no local timezone can shift a label to the previous day.

## Gotchas
- `NEXT_PUBLIC_APP_VERSION` is inlined by `next.config.ts` and is absent under Vitest, where it falls back to `"0.0.0"`. `plausibleVersion` treats that placeholder as "unknown ceiling" and skips the check rather than rejecting every report; the ceiling is injectable so tests can assert the real behaviour.
- `payload.ts` reads the version from `process.env` rather than importing `APP_VERSION` from `_components/app-version.tsx`: the unit suite runs in the node environment and cannot parse JSX.
- Install id lives in the `telemetry_identity` table so it survives blue/green release dirs and containers; `.backflip/` (gitignored) is only the fallback, and a read-only container filesystem just means a fresh id when the DB is also down. A clone has its own DB, so it is a new install, which is the intent. Existing file ids are copied into the DB the first time it is reachable.
- `register()` fires once per server instance, so restarts report each time; the receiver's per-install 60s ceiling (`L2-TELEMETRY-17`) absorbs rapid restarts. `next build` is skipped via `NEXT_PHASE`.
- Standalone: `instrumentation.ts` compiles to `.next/server/instrumentation.js`, which the standalone trace includes; `NEXT_PUBLIC_APP_VERSION` is inlined at build, so no package.json is needed at runtime.
- Local verification without touching the running dev server: start a second dev server on a spare port with `TELEMETRY_HASH_SALT` and `NEXT_DIST_DIR` set, post to it, then read both tables directly.

## Retention without a scheduler
The sweep hangs off ingest rather than a cron entry, because this is a starter someone else deploys: a retention policy that depends on the operator installing a cron job is a policy that never runs. An accepted write triggers `maybePruneOldStarts` fire-and-forget, throttled to once per 24h per process.

Consequences worth knowing:
- A deployment with no traffic never prunes. Correct — it is also not growing.
- The throttle is in memory, so a deploy forgets it and the next report sweeps again. Harmless: the delete is indexed on `createdAt` and normally matches nothing.
- Sweeps are not awaited and failures are invisible by design. If retention ever needs to be *provable* rather than best-effort, that is the point to move it to a real job.

## Install manager
- Collapsed by default: the figures are the point of the section, the drawer is maintenance behind them.
- Ignored rows stay listed (dimmed) rather than disappearing — hiding them would make the switch one-way, and `ignored` is a judgement about data, so it has to be revisable.
- The switch is optimistic with a revert-and-toast on failure. A `revalidatePath` round-trip per toggle reads as a broken control on a slow connection.
- Only the first 8 characters of `installIdHash` are rendered. Enough to tell two rows apart, and there is nothing to gain from showing more of a value that is already one-way.
- List is capped at 50 rows and scrolls at `max-h-[420px]`; a drawer that pushes the rest of the Overview off-screen is worse than one that scrolls.

## TODO / next
- The manager has no filter or paging. Fine at 50 installs; revisit if the list ever gets long enough to need searching.
