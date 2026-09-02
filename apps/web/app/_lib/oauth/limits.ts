import { clientIp } from "@/app/_lib/client-ip"
import { createRateLimiter, type RateLimiter } from "@/app/_lib/rate-limit"

/**
 * Rate limits for the connector surface. In-process only (see `rate-limit.ts`)
 * — one pm2 process / container per instance, same caveat as the login throttle.
 * Declared here rather than inline in each route so the MCP resource server and
 * the authorization server share one definition.
 *
 * @spec L2-MCP-30
 */

/**
 * Re-exported from `_lib/client-ip` — it moved app-wide when telemetry ingest
 * needed the same header handling (`L2-TELEMETRY-05`). Connector code keeps
 * importing it from here.
 */
export { clientIp }

const HOUR_MS = 60 * 60_000
const FIVE_MIN_MS = 5 * 60_000

/** `POST /api/oauth/register` — 10 / hour per IP. Open DCR, so it needs a cap. */
export const registerLimiter: RateLimiter = createRateLimiter({
  max: 10,
  windowMs: HOUR_MS,
})

/** `POST /api/oauth/token` — 60 / 5 min per IP. */
export const tokenLimiter: RateLimiter = createRateLimiter({
  max: 60,
  windowMs: FIVE_MIN_MS,
})

/**
 * `/api/mcp` — 240 / 5 min per token (keyed on the token hash, never the raw
 * token). Applied by `requireBearer` before any db work.
 */
export const mcpLimiter: RateLimiter = createRateLimiter({
  max: 240,
  windowMs: FIVE_MIN_MS,
})

/**
 * `/api/mcp` without a bearer token — 60 / 5 min per IP (`L2-MCP-54`).
 *
 * That path is answered from static data, but it is still an endpoint anyone
 * can hit; the cap is what stops a prober spraying challenges indefinitely. The
 * ceiling is generous on purpose: a real client meets this response once per
 * connection, when it discovers where to authenticate, so 60 is far above
 * honest use and far below a useful flood.
 *
 * Keyed per IP rather than per token for the obvious reason — there is no token.
 */
export const mcpChallengeLimiter: RateLimiter = createRateLimiter({
  max: 60,
  windowMs: FIVE_MIN_MS,
})
