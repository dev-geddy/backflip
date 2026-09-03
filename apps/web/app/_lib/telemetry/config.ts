import { createHmac } from "node:crypto"

/**
 * Telemetry ingest configuration and the one-way hashing both identifiers go
 * through before they touch the database.
 *
 * The salt is deliberately a plain env var with **no default**: a self-hosted
 * deployment that never sets `TELEMETRY_HASH_SALT` collects nothing, because
 * `POST /api/public/telemetry/start` short-circuits to a no-op. Telemetry is on
 * by default for the *client* (it reports to the upstream project) and off by
 * default for the *server* (a fork's own instance stores nothing until its
 * operator opts in).
 *
 * @spec L2-TELEMETRY-03, L2-TELEMETRY-04
 */

/** Window every dashboard figure is computed over. */
export const WINDOW_DAYS = 30

/** Minimum gap between two counted starts from one install. */
export const MIN_START_INTERVAL_MS = 60_000

/** Counted starts one install may contribute per UTC day. */
export const MAX_STARTS_PER_INSTALL_PER_DAY = 20

/** Largest ingest body accepted, in bytes. A well-formed report is ~120. */
export const MAX_BODY_BYTES = 1024

/**
 * How long individual `telemetry_start` rows are kept.
 *
 * Only the event rows expire; `telemetry_install` keeps its all-time
 * `startCount` forever, so pruning costs history in the charts, never the
 * knowledge that an install exists. A year plus a margin means a
 * year-over-year comparison is always available, and the table cannot grow
 * without bound on a long-lived deployment.
 */
export const START_RETENTION_DAYS = 400

/**
 * Minimum gap between two prune sweeps in one process. The sweep is triggered
 * opportunistically by ingest rather than by a scheduler: this is a
 * self-hosted starter, and a retention policy that depends on someone
 * installing a cron job is a retention policy that never runs. A deployment
 * with no traffic never prunes, which is correct — it is also not growing.
 */
export const PRUNE_MIN_INTERVAL_MS = 24 * 60 * 60_000

/**
 * Ingest secret. Absent → the endpoint stores nothing. Read lazily (not at
 * module scope) so tests can vary it and so a missing value never breaks the
 * build.
 */
export function telemetrySalt(): string | null {
  const salt = process.env.TELEMETRY_HASH_SALT?.trim()
  return salt ? salt : null
}

/** Whether this deployment ingests telemetry at all. */
export function telemetryIngestEnabled(): boolean {
  return telemetrySalt() !== null
}

/**
 * HMAC-SHA256 of `value` under the ingest salt, hex, truncated to 32 chars
 * (128 bits — far past collision risk at this scale, half the row width).
 *
 * Used for both the install id and the source IP. Neither raw value is ever
 * stored or logged: the install id is pseudonymous already, and the IP is
 * personal data we only ever need to compare, never to read back.
 *
 * `domain` separates the two keyspaces so an install-id hash can never be
 * compared against an IP hash.
 */
export function telemetryHash(
  domain: "install" | "ip",
  value: string
): string | null {
  const salt = telemetrySalt()
  if (!salt) return null
  return createHmac("sha256", salt)
    .update(`${domain}:${value}`)
    .digest("hex")
    .slice(0, 32)
}

/** UTC calendar day (`YYYY-MM-DD`) — the unit both day rules are counted in. */
export function utcDay(at: Date): string {
  return at.toISOString().slice(0, 10)
}

/**
 * Oldest `createdAt` a `telemetry_start` row may have and still survive a
 * retention sweep at `now`.
 *
 * Lives here rather than beside the sweep itself so it stays free of
 * `server-only` and can be unit-tested — the date arithmetic is the part worth
 * freezing, the delete around it is not.
 */
export function retentionCutoff(
  now: Date,
  days: number = START_RETENTION_DAYS
): Date {
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - days)
  return cutoff
}
