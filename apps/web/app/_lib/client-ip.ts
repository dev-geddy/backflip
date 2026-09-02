/**
 * Client IP for rate-limiter keys, from the edge proxy's forwarded headers.
 *
 * The **last** `x-forwarded-for` hop is the trustworthy one: both edge flavours
 * append the peer they actually observed (nginx `$proxy_add_x_forwarded_for`,
 * Caddy `reverse_proxy`), so every hop before it is caller-supplied. Reading
 * the first hop would let one attacker mint a fresh bucket per request with a
 * forged header and bypass the cap entirely.
 *
 * Falls back to `x-real-ip` (nginx sets it via `proxy_set_header`, which
 * replaces any inbound value) and finally to `"unknown"`, which buckets all
 * header-less callers together — deliberate, it fails closed rather than open.
 *
 * Assumes exactly one trusted proxy in front of the app. An extra untrusted
 * layer (CDN) would collapse everyone onto that layer's address — still closed,
 * never open.
 *
 * App-wide because two unrelated surfaces key limiters on it: the connector
 * (`L2-MCP-30`) and telemetry ingest (`L2-TELEMETRY-05`).
 *
 * @spec L2-MCP-30, L2-TELEMETRY-05
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const hops = forwarded.split(",")
    const last = hops[hops.length - 1]?.trim()
    if (last) return last
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}
