import type { McpServer } from "@modelcontextprotocol/server"

import { can, type Role } from "@/app/_lib/auth/permissions"
import type { McpAuthContext, McpScope } from "@/app/_lib/oauth/types"

import { DASHBOARD_SCOPE, registerDashboardSummary } from "./dashboard"
import { PLATFORM_SCOPE, registerPlatformStatus } from "./platform"
import { registerGetUser, registerListUsers, USERS_SCOPE } from "./users"
import { registerWhoami, WHOAMI_SCOPE } from "./whoami"

/**
 * The read-only tool surface (phase 1) and the pure scope/capability filter
 * that decides which of them a given request may see.
 *
 * Each entry carries its own plain-language `title`/`summary` and a `mutates`
 * flag, because the admin's MCP capabilities page renders straight from this
 * list (`L2-MCP-64`). A tool added here shows up there with no second edit —
 * which is the point: a capability list that is maintained by hand drifts from
 * the surface it claims to describe.
 *
 * @spec L2-MCP-04, L2-MCP-05, L2-MCP-06, L2-MCP-07, L2-MCP-08, L2-MCP-20,
 *   L2-MCP-64
 */

export type ToolGroup = "Platform"

export type ToolDef = {
  name: string
  scope: McpScope
  /** Which section of the admin capabilities page this tool is listed under. */
  group: ToolGroup
  /** Short human label — the capabilities page's row heading. */
  title: string
  /** One sentence, operator-facing: what a connected client can do with it. */
  summary: string
  /**
   * True only for tools that change stored data (`readOnlyHint: false`).
   * Every tool is read-only today (`L1-CON-06`); the flag exists so the
   * capabilities page never has to assume that stays true.
   */
  mutates: boolean
  register: (server: McpServer, ctx: McpAuthContext) => void
}

export const TOOL_DEFS: ToolDef[] = [
  {
    name: "whoami",
    scope: WHOAMI_SCOPE,
    group: "Platform",
    title: "Identify the connection",
    summary:
      "Reports which account the connection is acting as, and the scopes it was granted.",
    mutates: false,
    register: registerWhoami,
  },
  {
    name: "list_users",
    scope: USERS_SCOPE,
    group: "Platform",
    title: "List members",
    summary:
      "Lists platform members with names, emails and roles. Search and paging, no changes.",
    mutates: false,
    register: registerListUsers,
  },
  {
    name: "get_user",
    scope: USERS_SCOPE,
    group: "Platform",
    title: "Look up one member",
    summary: "Fetches a single member by id or email.",
    mutates: false,
    register: registerGetUser,
  },
  {
    name: "get_platform_status",
    scope: PLATFORM_SCOPE,
    group: "Platform",
    title: "Integration status",
    summary:
      "Reports which integrations are switched on and configured. Never keys or secrets.",
    mutates: false,
    register: registerPlatformStatus,
  },
  {
    name: "get_dashboard_summary",
    scope: DASHBOARD_SCOPE,
    group: "Platform",
    title: "Dashboard summary",
    summary: "Member counts by role and the five most recent signups.",
    mutates: false,
    register: registerDashboardSummary,
  },
]

/**
 * Tool visibility = token scopes ∩ role capabilities (`L2-MCP-20`). A tool
 * failing this filter is never registered, so it never appears in
 * `tools/list` and a direct call resolves as "unknown tool". Pure — no SDK
 * or DB involved, so registration behavior is unit-testable directly.
 */
export function visibleTools(ctx: McpAuthContext): ToolDef[] {
  return toolsForGrant(ctx.scopes, ctx.role)
}

/**
 * The same intersection, addressed by scopes + role rather than a live request
 * context. The admin needs to answer "what can *this stored grant* actually
 * see?" without a bearer token in hand (`L2-MCP-65`), and answering it by
 * re-deriving the rule would be the surest way to have the admin and the
 * connector disagree. One filter, two callers.
 */
export function toolsForGrant(scopes: McpScope[], role: Role): ToolDef[] {
  return TOOL_DEFS.filter(
    (tool) => scopes.includes(tool.scope) && can(role, tool.scope)
  )
}
