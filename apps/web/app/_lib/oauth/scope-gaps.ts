import { can, type Role } from "@/app/_lib/auth/permissions"

import { grantableScopes, SCOPE_LABELS } from "./scopes"
import { MCP_SCOPES, type McpScope } from "./types"

/**
 * The half of the scope reconciliation that needs nothing but the scope list
 * itself — split out of `grant-health.ts` on purpose.
 *
 * `grantHealth` has to consult the tool registry to say how many tools a grant
 * reaches, and that registry transitively imports the database client. The
 * client-side settings table only ever asks the *ceiling* question ("is this
 * client registered for everything on offer?"), which is pure. Keeping the two
 * in one module dragged `pg` into the browser bundle; keeping them apart is
 * what lets a `"use client"` component import this at all.
 *
 * @spec L2-MCP-65, L2-MCP-66
 */

export type ScopeGap = {
  scope: McpScope
  /** The consent screen's wording, so the admin and the consent screen agree. */
  label: string
}

export function gaps(scopes: McpScope[]): ScopeGap[] {
  return scopes.map((scope) => ({ scope, label: SCOPE_LABELS[scope].title }))
}

/**
 * Diagnose a *client's* ceiling rather than a user's grant. A client registered
 * before a scope existed carries the older `MCP_SCOPES` snapshot in its own
 * `scopes` column; once that column is enforced as a ceiling, such a client can
 * never be granted the newer scopes however often its user reconnects — the
 * one failure a reconnect does not fix, so the admin has to say so and offer to
 * widen it (`L2-MCP-66`).
 */
export function clientCeilingHealth(clientScopes: McpScope[]): {
  offered: McpScope[]
  withheld: ScopeGap[]
  limited: boolean
} {
  const offered = MCP_SCOPES.filter((scope) => clientScopes.includes(scope))
  const withheld = MCP_SCOPES.filter((scope) => !clientScopes.includes(scope))
  return { offered, withheld: gaps(withheld), limited: withheld.length > 0 }
}

/** Scopes this role could grant that the client would never be offered. */
export function unreachableForRole(
  clientScopes: McpScope[],
  role: Role
): ScopeGap[] {
  return gaps(
    grantableScopes(role).filter(
      (scope) => !clientScopes.includes(scope) && can(role, scope)
    )
  )
}
