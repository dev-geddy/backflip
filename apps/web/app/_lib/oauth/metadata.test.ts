import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GET as authorizationServerMetadata } from "@/app/api/oauth/authorization-server-metadata/route"
import { GET as protectedResourceMetadata } from "@/app/api/oauth/protected-resource-metadata/route"

/**
 * The two discovery documents (`L2-MCP-10`, `L2-MCP-11`). A Claude client
 * bootstraps the whole connector from these, so their shape is a contract:
 * wrong `issuer`/`resource` and the flow either never starts or produces
 * tokens bound to the wrong audience (`L2-MCP-33`). Also locks the kill switch
 * (`L2-MCP-37`).
 */

const ORIGIN = "https://app.example.com"

beforeEach(() => {
  vi.stubEnv("AUTH_URL", `${ORIGIN}/`)
  vi.stubEnv("MCP_ENABLED", "true")
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("authorization server metadata", () => {
  it("404s while the connector is disabled", async () => {
    vi.stubEnv("MCP_ENABLED", undefined)
    expect((await authorizationServerMetadata()).status).toBe(404)
  })

  it("advertises every endpoint on the issuer origin", async () => {
    const res = await authorizationServerMetadata()
    expect(res.status).toBe(200)
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600")

    const doc = await res.json()
    expect(doc).toEqual({
      issuer: ORIGIN,
      authorization_endpoint: `${ORIGIN}/api/oauth/authorize`,
      token_endpoint: `${ORIGIN}/api/oauth/token`,
      registration_endpoint: `${ORIGIN}/api/oauth/register`,
      revocation_endpoint: `${ORIGIN}/api/oauth/revoke`,
      scopes_supported: ["account", "dashboard", "users.view", "settings"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      revocation_endpoint_auth_methods_supported: ["none"],
    })
  })

  it("never advertises plain PKCE, implicit, or a client secret method", async () => {
    const doc = await (await authorizationServerMetadata()).json()
    expect(doc.code_challenge_methods_supported).not.toContain("plain")
    expect(doc.grant_types_supported).not.toContain("implicit")
    expect(doc.token_endpoint_auth_methods_supported).toEqual(["none"])
    expect(doc.scopes_supported).not.toContain("users.edit")
  })
})

describe("protected resource metadata", () => {
  it("404s while the connector is disabled", async () => {
    vi.stubEnv("MCP_ENABLED", undefined)
    expect((await protectedResourceMetadata()).status).toBe(404)
  })

  it("points at the MCP endpoint and back at the issuer", async () => {
    const res = await protectedResourceMetadata()
    expect(res.status).toBe(200)
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600")

    await expect(res.json()).resolves.toEqual({
      resource: `${ORIGIN}/api/mcp`,
      authorization_servers: [ORIGIN],
      scopes_supported: ["account", "dashboard", "users.view", "settings"],
      bearer_methods_supported: ["header"],
    })
  })

  it("agrees with the authorization server document on the issuer", async () => {
    const as = await (await authorizationServerMetadata()).json()
    const prm = await (await protectedResourceMetadata()).json()
    expect(prm.authorization_servers).toEqual([as.issuer])
    expect(prm.resource.startsWith(as.issuer)).toBe(true)
  })
})
