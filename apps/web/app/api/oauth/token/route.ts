import { NextResponse } from "next/server"

import { findClientByClientId, touchClient } from "@/app/_lib/oauth/clients"
import { consumeAuthorizationCode } from "@/app/_lib/oauth/codes"
import { isMcpEnabled } from "@/app/_lib/oauth/config"
import {
  connectorDisabledResponse,
  NO_STORE_HEADERS,
  oauthErrorResponse,
  rateLimitedResponse,
} from "@/app/_lib/oauth/errors"
import { clientIp, tokenLimiter } from "@/app/_lib/oauth/limits"
import { formatScopes } from "@/app/_lib/oauth/scopes"
import { issueTokenPair, rotateRefreshToken } from "@/app/_lib/oauth/tokens"
import type { IssuedTokens } from "@/app/_lib/oauth/types"

// Reads/writes postgres via pg — Node runtime, not edge.
export const runtime = "nodejs"

const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"

/** RFC 6749 token response. */
function tokenResponse(tokens: IssuedTokens): NextResponse {
  return NextResponse.json(
    {
      access_token: tokens.accessToken,
      token_type: "Bearer",
      expires_in: tokens.expiresIn,
      refresh_token: tokens.refreshToken,
      scope: formatScopes(tokens.scopes),
    },
    { status: 200, headers: NO_STORE_HEADERS }
  )
}

/**
 * POST /api/oauth/token — the token endpoint.
 *
 * Accepts **only** `application/x-www-form-urlencoded` (RFC 6749 §4.1.3): a
 * Claude client posts both the initial exchange and every refresh that way, so
 * a JSON-only endpoint would simply never be called successfully.
 *
 * Public clients: the caller identifies itself with `client_id` in the body and
 * proves possession with PKCE — there is no secret to check (`L2-MCP-26`).
 *
 * Status codes: 200 tokens · 400 invalid request/grant/client ·
 * 404 connector disabled · 429 rate limited. Always `Cache-Control: no-store`.
 *
 * @spec L2-MCP-15, L2-MCP-24, L2-MCP-26, L2-MCP-27, L2-MCP-30, L2-MCP-32,
 *       L2-MCP-33, L2-MCP-37, L2-MCP-40, L2-MCP-41
 */
export async function POST(request: Request) {
  if (!isMcpEnabled()) return connectorDisabledResponse()

  const ip = clientIp(request)
  if (tokenLimiter.blocked(ip)) {
    return rateLimitedResponse(tokenLimiter.retryAfterMs(ip))
  }
  tokenLimiter.hit(ip)

  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes(FORM_CONTENT_TYPE)) {
    return oauthErrorResponse({
      error: "invalid_request",
      description: `Content-Type must be ${FORM_CONTENT_TYPE}.`,
    })
  }

  let form: URLSearchParams
  try {
    form = new URLSearchParams(await request.text())
  } catch {
    return oauthErrorResponse({
      error: "invalid_request",
      description: "The request body could not be read.",
    })
  }

  const grantType = form.get("grant_type")?.trim() ?? ""
  if (!grantType) {
    return oauthErrorResponse({
      error: "invalid_request",
      description: "Missing grant_type.",
    })
  }

  // Reject a grant type this server doesn't support at all *before* looking at
  // client_id. Checking afterwards would let an unauthenticated caller probe
  // client_id existence: invalid_client for an unknown id vs
  // unsupported_grant_type for a registered one is itself an oracle
  // (`L2-MCP-41`) — so unsupported types must short-circuit before any client
  // lookup happens, regardless of what client_id was sent alongside them.
  if (grantType !== "authorization_code" && grantType !== "refresh_token") {
    return oauthErrorResponse({
      error: "unsupported_grant_type",
      description: "Supported grants: authorization_code, refresh_token.",
    })
  }

  const clientId = form.get("client_id")?.trim() ?? ""
  if (!clientId) {
    return oauthErrorResponse({
      error: "invalid_client",
      description: "Missing client_id.",
    })
  }

  let client
  try {
    client = await findClientByClientId(clientId)
  } catch {
    return oauthErrorResponse({ error: "server_error" }, 500)
  }
  if (!client) {
    return oauthErrorResponse({
      error: "invalid_client",
      description: "Client authentication failed.",
    })
  }
  // grantType is already known-supported by the server at this point, so this
  // only fires for a client registered without it — no existence oracle since
  // we've already confirmed the client exists above.
  if (!client.grantTypes.includes(grantType)) {
    return oauthErrorResponse({
      error: "unsupported_grant_type",
      description: "This grant type is not available for this client.",
    })
  }

  if (grantType === "authorization_code") {
    const code = form.get("code")?.trim() ?? ""
    const redirectUri = form.get("redirect_uri")?.trim() ?? ""
    const codeVerifier = form.get("code_verifier")?.trim() ?? ""

    if (!code || !redirectUri || !codeVerifier) {
      return oauthErrorResponse({
        error: "invalid_request",
        description: "code, redirect_uri and code_verifier are required.",
      })
    }

    try {
      const consumed = await consumeAuthorizationCode({
        code,
        clientDbId: client.id,
        redirectUri,
        codeVerifier,
      })
      if (!consumed.ok) return oauthErrorResponse(consumed.failure)

      const tokens = await issueTokenPair({
        userId: consumed.userId,
        clientDbId: client.id,
        scopes: consumed.scopes,
        resource: consumed.resource,
        // The code row's id is the family root, so replaying the code can
        // revoke exactly the tokens it minted (`L2-MCP-32`).
        familyId: consumed.familyId,
      })

      await touchClient(client.id)
      return tokenResponse(tokens)
    } catch {
      return oauthErrorResponse({ error: "server_error" }, 500)
    }
  }

  if (grantType === "refresh_token") {
    const refreshToken = form.get("refresh_token")?.trim() ?? ""
    if (!refreshToken) {
      return oauthErrorResponse({
        error: "invalid_request",
        description: "refresh_token is required.",
      })
    }

    try {
      const rotated = await rotateRefreshToken({
        refreshToken,
        clientDbId: client.id,
      })
      if (!rotated.ok) return oauthErrorResponse(rotated.failure)

      await touchClient(client.id)
      return tokenResponse(rotated.tokens)
    } catch {
      return oauthErrorResponse({ error: "server_error" }, 500)
    }
  }

  return oauthErrorResponse({
    error: "unsupported_grant_type",
    description: "Supported grants: authorization_code, refresh_token.",
  })
}
