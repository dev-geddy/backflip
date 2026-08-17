import { db, generateToken, oauthClients } from "@workspace/db"
import { eq } from "drizzle-orm"

import { MCP_SCOPES, type McpScope } from "./types"

/**
 * The OAuth client registry. Clients arrive through open Dynamic Client
 * Registration (RFC 7591) — Claude registers itself on first connect — so
 * everything here is written assuming the caller is anonymous and hostile.
 *
 * Public clients only: no secret is ever issued or stored, PKCE is the proof
 * of possession instead (`L2-MCP-26`).
 *
 * @spec L2-MCP-12, L2-MCP-21, L2-MCP-31
 */

export type OAuthClientRecord = typeof oauthClients.$inferSelect

/** The only grant types this authorization server implements. */
const SUPPORTED_GRANT_TYPES = ["authorization_code", "refresh_token"] as const

/** Loopback hosts allowed to use plain `http` — native/CLI clients (RFC 8252). */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"])

/** Generous but bounded, so a registration can't be used to store blobs. */
const MAX_REDIRECT_URI_LENGTH = 2048

/**
 * Whether a redirect URI is acceptable to register or to be redirected to.
 * Requires an absolute `https` URL — or `http` on `localhost`/`127.0.0.1`, the
 * only case where plaintext is safe because the request never leaves the host.
 * A fragment is rejected outright: the authorization response appends its own
 * query and a fragment would let a client smuggle one past the exact match.
 */
export function isValidRedirectUri(uri: string): boolean {
  if (typeof uri !== "string") return false
  const value = uri.trim()
  if (!value || value.length > MAX_REDIRECT_URI_LENGTH) return false
  // A bare trailing "#" parses to an empty `hash`; reject on the raw string too.
  if (value.includes("#")) return false

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  // Embedded credentials would end up in logs and referrers.
  if (url.username || url.password) return false
  if (url.protocol === "https:") return true
  if (url.protocol === "http:") return LOOPBACK_HOSTS.has(url.hostname)
  return false
}

/**
 * Exact, full-string match of `redirectUri` against the client's registered
 * set. No prefix, no wildcard, no normalization — anything looser is the
 * classic open-redirect / token-theft hole (`L2-MCP-31`).
 */
export function redirectUriAllowed(
  client: OAuthClientRecord,
  redirectUri: string
): boolean {
  if (!redirectUri) return false
  return client.redirectUris.some((registered) => registered === redirectUri)
}

/**
 * Register a public client. The caller (the DCR route) has already validated
 * the metadata; this narrows it again to what the server actually supports:
 * unknown grant types are dropped, and the auth method is pinned to `"none"`
 * regardless of what was asked for — this server issues no client secrets.
 */
export async function registerClient(input: {
  clientName: string
  redirectUris: string[]
  grantTypes?: string[]
  scopes?: McpScope[]
  tokenEndpointAuthMethod?: string
}): Promise<OAuthClientRecord> {
  const grantTypes = SUPPORTED_GRANT_TYPES.filter((grant) =>
    (input.grantTypes ?? SUPPORTED_GRANT_TYPES).includes(grant)
  )

  const [row] = await db
    .insert(oauthClients)
    .values({
      clientId: generateToken(),
      clientSecretHash: null,
      clientName: input.clientName,
      redirectUris: input.redirectUris,
      grantTypes: grantTypes.length ? grantTypes : [...SUPPORTED_GRANT_TYPES],
      scopes: input.scopes?.length ? input.scopes : [...MCP_SCOPES],
      tokenEndpointAuthMethod: "none",
    })
    .returning()

  if (!row) throw new Error("Client registration returned no row")
  return row
}

/** Look up a client by its public `client_id`. Unknown id → null, never throws. */
export async function findClientByClientId(
  clientId: string
): Promise<OAuthClientRecord | null> {
  if (!clientId) return null
  const [row] = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
  return row ?? null
}

/**
 * Best-effort `lastUsedAt` stamp, for the account UI's "last used" column.
 * Never throws: telemetry must not fail a token exchange or a tool call.
 */
export async function touchClient(clientDbId: string): Promise<void> {
  try {
    await db
      .update(oauthClients)
      .set({ lastUsedAt: new Date() })
      .where(eq(oauthClients.id, clientDbId))
  } catch {
    // Ignored on purpose.
  }
}
