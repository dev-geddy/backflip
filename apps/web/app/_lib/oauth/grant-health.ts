import type { Role } from "@/app/_lib/auth/permissions"

import { toolsForGrant } from "@/app/_lib/mcp/tools"
import { gaps, type ScopeGap } from "./scope-gaps"
import { grantableScopes } from "./scopes"
import type { McpScope } from "./types"

/**
 * Why a working connector can still look broken.
 *
 * A token's scope list is frozen at consent time. When the deployment later
 * gains a scope, every existing grant keeps the narrower set it was minted
 * with, so the tools behind the new scope are never registered for it
 * (`L2-MCP-20`) and simply do not appear in `tools/list`. From the client that
 * is indistinguishable from "this server doesn't have those tools", and from
 * the admin it was, until now, indistinguishable from a healthy connection.
 *
 * This module is the reconciliation the admin was missing: given what a grant
 * actually holds, it names what is missing and what that costs in tools. Pure —
 * no database call, no SDK — so both the account UI and the capabilities page
 * can call it, and so it is testable without a token.
 *
 * **Server-side only in practice.** It reads the tool registry to count what a
 * grant reaches, and that registry transitively imports the database client, so
 * importing this from a `"use client"` component pulls `pg` into the browser
 * bundle. The ceiling helpers a client component does need live in
 * `scope-gaps.ts` and are re-exported here for server callers' convenience.
 *
 * @spec L2-MCP-65
 */

export { clientCeilingHealth, unreachableForRole } from "./scope-gaps"
export type { ScopeGap } from "./scope-gaps"

export type GrantHealth = {
  /** Scopes the grant actually carries, narrowed to what the role still holds. */
  granted: McpScope[]
  /** Grantable-but-absent scopes: what a reconnect would add. */
  missing: ScopeGap[]
  /** Tool names this grant can see right now. */
  visibleTools: string[]
  /** Tool names it would gain by reconnecting. */
  unlockedByReconnect: string[]
  /** True when a reconnect would widen the grant — the "stale" flag. */
  stale: boolean
}

/**
 * Diagnose one stored grant. `granted` is intersected with the role's live
 * capabilities first, because a demotion narrows an existing token on next use
 * (`L2-MCP-34`) — reporting a scope the role no longer holds would overstate
 * what the connection can do.
 */
export function grantHealth(tokenScopes: McpScope[], role: Role): GrantHealth {
  const grantable = grantableScopes(role)
  const granted = grantable.filter((scope) => tokenScopes.includes(scope))
  const missing = grantable.filter((scope) => !tokenScopes.includes(scope))

  const now = toolsForGrant(granted, role).map((t) => t.name)
  const after = toolsForGrant(grantable, role).map((t) => t.name)

  return {
    granted,
    missing: gaps(missing),
    visibleTools: now,
    unlockedByReconnect: after.filter((name) => !now.includes(name)),
    stale: missing.length > 0,
  }
}
