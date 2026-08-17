/**
 * Connector configuration: the kill switch, the URLs every OAuth document is
 * derived from, and the token lifetimes. Pure env reads — no db, no imports
 * beyond this file, so routes, libs and tests can all use it.
 *
 * @spec L2-MCP-10, L2-MCP-11, L2-MCP-24, L2-MCP-25, L2-MCP-37
 */

/** Dev-only issuer fallback — this app's `yarn dev` port. */
const DEV_ORIGIN = "http://localhost:3070"

/**
 * Whether the MCP connector surface exists at all. Off unless `MCP_ENABLED` is
 * exactly `"true"`: every connector route 404s when this is false, so a
 * deployment opts in explicitly (`L2-MCP-37`).
 */
export function isMcpEnabled(): boolean {
  return process.env.MCP_ENABLED === "true"
}

/**
 * The OAuth issuer — the origin of `AUTH_URL`, with no trailing slash (a
 * `URL.origin` never has one). Every advertised endpoint, the resource
 * identifier and the PRM URL are built from this single helper so the issuer,
 * the audience and the metadata documents can never disagree.
 *
 * Outside production a missing `AUTH_URL` falls back to `http://localhost:3070`
 * so a local `yarn dev` works without extra env. In production it throws
 * instead: tokens minted against the wrong origin would be bound to the wrong
 * audience (`L2-MCP-33`), which is a real security problem, not a nuisance.
 */
export function issuerOrigin(): string {
  const raw = process.env.AUTH_URL?.trim()
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_URL is not set — the OAuth issuer is undefined")
    }
    return DEV_ORIGIN
  }
  return new URL(raw).origin
}

/**
 * The protected resource identifier (RFC 8707 audience) — the MCP endpoint
 * itself. Bound into every token at issue and re-checked on every request.
 */
export function mcpResourceUrl(): string {
  return `${issuerOrigin()}/api/mcp`
}

/**
 * Absolute URL of the RFC 9728 protected-resource metadata document. Sent in
 * the `WWW-Authenticate` challenge — this is what makes a Claude client start
 * the OAuth flow (`L2-MCP-03`).
 */
export function protectedResourceMetadataUrl(): string {
  return `${issuerOrigin()}/.well-known/oauth-protected-resource`
}

/** Authorization code lifetime — deliberately tiny, it is a one-shot handoff. */
export const AUTH_CODE_TTL_SEC = 60

/** Access token lifetime (60 min). */
export const ACCESS_TOKEN_TTL_SEC = 3600

/** Refresh token lifetime (30 days, sliding — rotation mints a fresh one). */
export const REFRESH_TOKEN_TTL_SEC = 2_592_000
