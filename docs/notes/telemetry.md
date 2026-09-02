# Notes (L3) — telemetry

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `packages/db/src/schema.ts` — `telemetryInstall` + `telemetryStart`. Satisfies `L2-TELEMETRY-01`, `L2-TELEMETRY-02`, `L2-DB-34`, `L2-DB-35`.
- `packages/db/migrations/0017_curved_inhumans.sql` — drizzle-kit generated; both tables + two indexes on `telemetry_start`.
- `scripts/track-start.mjs` — the client. Reads/creates `.backflip/install-id`, prints the first-run notice, posts once. Satisfies `L2-TELEMETRY-10`, `L2-TELEMETRY-11`, `L2-TELEMETRY-15`.
- `package.json` — root `dev` is `node scripts/track-start.mjs & turbo dev`. Yarn's portable shell handles `&`, so this stays cross-platform.
- `apps/web/app/_lib/telemetry/config.ts` — salt lookup, `telemetryHash`, `utcDay`, the four tuning constants. Satisfies `L2-TELEMETRY-03`, `L2-TELEMETRY-04`.
- `apps/web/app/_lib/telemetry/payload.ts` — strict zod schema + `plausibleVersion`. Satisfies `L2-TELEMETRY-06`.
- `apps/web/app/_lib/telemetry/limits.ts` — the three budgets. Satisfies `L2-TELEMETRY-05`.
- `apps/web/app/_lib/telemetry/record.ts` — the only writer. Satisfies `L2-TELEMETRY-07`, `L2-TELEMETRY-17`, `L2-TELEMETRY-21`.
- `apps/web/app/_lib/telemetry/queries.ts` — the only reader. Satisfies `L2-TELEMETRY-08`, `L2-TELEMETRY-20`.
- `apps/web/app/api/public/telemetry/start/route.ts` — ingest. Satisfies `L2-TELEMETRY-09`, `L2-TELEMETRY-22/23/24`.
- `apps/web/app/backflip/(protected)/_components/telemetry-cards.tsx` — the two cards. Satisfies `L2-TELEMETRY-12`.
- `apps/web/app/backflip/(protected)/page.tsx` — gates on `canAccessSettings`, `.catch(() => null)` around the read. Satisfies `L2-TELEMETRY-19`, `L2-TELEMETRY-25`.
- `apps/web/app/_lib/client-ip.ts` — `clientIp`, moved up from `_lib/oauth/limits.ts` (which re-exports it) when a second surface needed it. Shared by `L2-MCP-30` and `L2-TELEMETRY-05`.
- `devops/nginx/backflip-http.conf` / `backflip.conf` — `backflip_telemetry` zone (5r/m) + the `location = /api/public/telemetry/start` block with `client_max_body_size 2k`. Satisfies `L2-DEVOPS-27`.
- `apps/web/app/_lib/telemetry/{config,payload}.test.ts` — unit suites. Satisfies `L2-TELEMETRY-30`.
- `.env.example`, `README.md` (§ Anonymous usage telemetry) — the disclosure and both opt-outs.

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
- `.backflip/` is gitignored. A clone is therefore a new install, which is the intent — two people sharing one checkout are not two installs, and a fork is not the parent.
- Local verification without touching the running dev server: start a second dev server on a spare port with `TELEMETRY_HASH_SALT` and `NEXT_DIST_DIR` set, post to it, then read both tables directly.

## TODO / next
- No admin UI for `ignored` yet — flip it with SQL. Worth a toggle once there is enough data to need pruning.
- No retention policy on `telemetry_start`. Rows are small, but a `createdAt` cutoff job is the obvious follow-up.
