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
