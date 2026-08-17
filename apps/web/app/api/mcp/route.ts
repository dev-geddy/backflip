import { createMcpHandler } from "@modelcontextprotocol/server"

import { requireBearer } from "@/app/_lib/oauth/bearer"
import { isMcpEnabled } from "@/app/_lib/oauth/config"
import { buildMcpServer } from "@/app/_lib/mcp/server"

// Talks to `pg` (db) via the bearer gate and every tool — Node runtime, not edge.
export const runtime = "nodejs"

/**
 * `/api/mcp` — the MCP Streamable HTTP endpoint (`POST`/`GET`/`DELETE`,
 * answered by the SDK's handler). Stateless: a fresh `McpServer` is built
 * from this request's resolved `McpAuthContext`, so tool visibility always
 * reflects the token's scopes and the account's *current* role — no session,
 * nothing cached across requests.
 *
 * `MCP_ENABLED` off (default) → `404` for every method, before the bearer
 * gate even runs (`L2-MCP-37`). A missing/invalid/expired/wrong-audience
 * bearer token → whatever `requireBearer` returns (`401` +
 * `WWW-Authenticate`, `L2-MCP-03`, `L2-MCP-39`).
 *
 * @spec L2-MCP-01
 */
async function handle(request: Request): Promise<Response> {
  if (!isMcpEnabled()) return new Response(null, { status: 404 })

  const auth = await requireBearer(request)
  if (auth instanceof Response) return auth

  // Bound to this request's already-resolved auth context — the SDK's own
  // `ctx.authInfo` (passed below) is not consulted; `requireBearer` is the
  // single source of truth for who this request is.
  const handler = createMcpHandler(() => buildMcpServer(auth))

  const rawToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""

  return handler.fetch(request, {
    authInfo: {
      token: rawToken,
      clientId: auth.clientId,
      scopes: auth.scopes,
      expiresAt: Math.floor(auth.expiresAt.getTime() / 1000),
    },
  })
}

export const POST = handle
export const GET = handle
export const DELETE = handle
