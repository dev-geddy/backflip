import { createRateLimiter, type RateLimiter } from "@/app/_lib/rate-limit"

/**
 * Rate budgets for telemetry ingest, split by **effect** rather than by
 * request. The two figures the dashboard shows have very different threat
 * profiles:
 *
 * - *Total starts* is cheap to inflate and cheap to discount. Loose budget.
 * - *Unique installs* is the headline number, and forging it costs an attacker
 *   nothing but a fresh UUID. So creating a row gets its own, much tighter
 *   budget, spent only when a request actually results in a new install.
 *
 * In-process fixed windows (see `rate-limit.ts`) — one process per instance,
 * same caveat as the login and connector limiters. A restart forgives
 * outstanding budget; acceptable for a counter, and the daily install-row
 * budget is backstopped by nginx at the edge (`L2-DEVOPS-27`).
 *
 * @spec L2-TELEMETRY-05
 */

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * 60_000

/**
 * Any ingest request — 5 / minute per IP. Checked before the body is read, so
 * a flood costs a header parse and nothing else. Honest clients send one
 * request per `yarn dev`.
 */
export const ingestBurstLimiter: RateLimiter = createRateLimiter({
  max: 5,
  windowMs: MINUTE_MS,
})

/**
 * Requests that create a new install row — 3 / day per IP. A developer behind
 * one address legitimately clones the repo a handful of times at most; a
 * forger needs a new address per three fake installs, which is the single most
 * effective constraint available without proof-of-work.
 */
export const newInstallLimiter: RateLimiter = createRateLimiter({
  max: 3,
  windowMs: DAY_MS,
})

/**
 * All accepted reports — 60 / day per IP. The outer daily ceiling: generous
 * enough for several people restarting dev servers behind one NAT, far below
 * useful inflation. The new-install budget above nests inside it.
 */
export const ingestDailyLimiter: RateLimiter = createRateLimiter({
  max: 60,
  windowMs: DAY_MS,
})
