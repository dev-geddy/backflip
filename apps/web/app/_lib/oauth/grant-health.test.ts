import { describe, expect, it } from "vitest"

import {
  clientCeilingHealth,
  grantHealth,
  unreachableForRole,
} from "./grant-health"
import { MCP_SCOPES, type McpScope } from "./types"

/**
 * Locks the diagnosis the admin shows against the rule the connector actually
 * enforces (`L2-MCP-65`). The regression this guards is a grant minted before
 * a scope existed: it looks healthy while the client quietly sees fewer tools
 * than the server offers.
 */

/** A grant approved before `settings` was a connector scope. */
const OLD_GRANT: McpScope[] = ["account", "dashboard", "users.view"]

describe("grantHealth", () => {
  it("flags a grant minted before a newer scope existed", () => {
    const health = grantHealth(OLD_GRANT, "owner")

    expect(health.stale).toBe(true)
    expect(health.missing.map((m) => m.scope)).toEqual(["settings"])
    // The operator-facing wording comes from the consent screen's own copy, so
    // the two surfaces cannot describe the same scope differently.
    expect(health.missing.map((m) => m.label)).toEqual(["Platform status"])
  })

  it("names the tools a reconnect would unlock", () => {
    const health = grantHealth(OLD_GRANT, "owner")

    expect(health.visibleTools).toContain("whoami")
    expect(health.visibleTools).not.toContain("get_platform_status")
    expect(health.unlockedByReconnect).toEqual(["get_platform_status"])
  })

  it("calls a fully scoped owner grant healthy", () => {
    const health = grantHealth([...MCP_SCOPES], "owner")

    expect(health.stale).toBe(false)
    expect(health.missing).toEqual([])
    expect(health.unlockedByReconnect).toEqual([])
    expect(health.visibleTools).toHaveLength(5)
  })

  it("never reports a scope the role no longer holds as granted", () => {
    // A demotion narrows an existing token on next use (`L2-MCP-34`); the
    // admin must not claim the connection still has settings access.
    const health = grantHealth([...MCP_SCOPES], "teammate")

    expect(health.granted).toEqual(["account", "dashboard"])
    expect(health.stale).toBe(false)
    expect(health.visibleTools.sort()).toEqual(
      ["whoami", "get_dashboard_summary"].sort()
    )
  })

  it("treats a teammate grant as complete even though it sees little", () => {
    // "Stale" means "a reconnect would widen this", not "this is small".
    expect(grantHealth(["account", "dashboard"], "teammate").stale).toBe(false)
  })
})

describe("clientCeilingHealth", () => {
  it("flags a client registered before the newer scopes", () => {
    const health = clientCeilingHealth(OLD_GRANT)

    expect(health.limited).toBe(true)
    expect(health.withheld.map((w) => w.scope)).toEqual(["settings"])
    expect(health.offered).toEqual(OLD_GRANT)
  })

  it("calls a current client unlimited", () => {
    expect(clientCeilingHealth([...MCP_SCOPES]).limited).toBe(false)
  })
})

describe("unreachableForRole", () => {
  it("reports only what this role could otherwise have been granted", () => {
    // An owner loses `settings` to the ceiling…
    expect(unreachableForRole(OLD_GRANT, "owner").map((g) => g.scope)).toEqual([
      "settings",
    ])

    // …while a teammate loses nothing, because it could never grant it.
    expect(unreachableForRole(OLD_GRANT, "teammate")).toEqual([])
  })
})
