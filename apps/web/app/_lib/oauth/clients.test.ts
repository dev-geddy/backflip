import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  isValidRedirectUri,
  redirectUriAllowed,
  registerClient,
  type OAuthClientRecord,
} from "./clients"

/**
 * Redirect-URI rules (`L2-MCP-31`) and the public-client guarantee
 * (`L2-MCP-12`, `L2-MCP-21`). The Drizzle client is a recording stub — the
 * exact-match and URI-shape logic is what matters here, and none of it needs a
 * database.
 */

const h = vi.hoisted(() => {
  const inserts: Array<Record<string, unknown>> = []
  const state = { returning: [{ id: "client-row-1" }] as unknown[] }

  const db = {
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        returning: async () => {
          inserts.push(values)
          return state.returning
        },
      }),
    }),
  }

  return {
    db,
    inserts,
    state,
    reset() {
      inserts.length = 0
    },
  }
})

vi.mock("@workspace/db", async () => {
  process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:5432/test"
  const actual =
    await vi.importActual<typeof import("@workspace/db")>("@workspace/db")
  return { ...actual, db: h.db }
})

function client(redirectUris: string[]): OAuthClientRecord {
  return {
    id: "client-row-1",
    clientId: "public-client-id",
    clientSecretHash: null,
    clientName: "Claude",
    redirectUris,
    grantTypes: ["authorization_code", "refresh_token"],
    scopes: ["account"],
    tokenEndpointAuthMethod: "none",
    createdAt: new Date(),
    lastUsedAt: null,
  }
}

beforeEach(() => {
  h.reset()
})

describe("isValidRedirectUri", () => {
  it("accepts absolute https URLs", () => {
    expect(isValidRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(
      true
    )
    expect(isValidRedirectUri("https://client.example/cb?tenant=acme")).toBe(
      true
    )
  })

  it("accepts http only on loopback hosts", () => {
    expect(isValidRedirectUri("http://localhost:8080/cb")).toBe(true)
    expect(isValidRedirectUri("http://127.0.0.1:1234/cb")).toBe(true)
    expect(isValidRedirectUri("http://evil.example/cb")).toBe(false)
    expect(isValidRedirectUri("http://localhost.evil.example/cb")).toBe(false)
  })

  it("rejects fragments, relative URIs and non-http schemes", () => {
    expect(isValidRedirectUri("https://client.example/cb#frag")).toBe(false)
    expect(isValidRedirectUri("https://client.example/cb#")).toBe(false)
    expect(isValidRedirectUri("/cb")).toBe(false)
    expect(isValidRedirectUri("javascript:alert(1)")).toBe(false)
    expect(isValidRedirectUri("data:text/html,x")).toBe(false)
    expect(isValidRedirectUri("")).toBe(false)
  })

  it("rejects embedded credentials and absurdly long URIs", () => {
    expect(isValidRedirectUri("https://user:pw@client.example/cb")).toBe(false)
    expect(
      isValidRedirectUri(`https://client.example/${"a".repeat(4000)}`)
    ).toBe(false)
  })
})

describe("redirectUriAllowed", () => {
  const registered = "https://claude.ai/api/mcp/auth_callback"

  it("matches the full string only", () => {
    const record = client([registered])
    expect(redirectUriAllowed(record, registered)).toBe(true)
    // Prefix / suffix / case / trailing-slash variants are all different URIs.
    expect(
      redirectUriAllowed(record, "https://claude.ai/api/mcp/auth_callback/x")
    ).toBe(false)
    expect(
      redirectUriAllowed(record, "https://claude.ai/api/mcp/auth_callback/")
    ).toBe(false)
    expect(
      redirectUriAllowed(record, "https://claude.ai/api/mcp/auth_callback?x=1")
    ).toBe(false)
    expect(
      redirectUriAllowed(
        record,
        "https://claude.ai.evil.test/api/mcp/auth_callback"
      )
    ).toBe(false)
    expect(redirectUriAllowed(record, "")).toBe(false)
  })

  it("accepts any one of several registered URIs", () => {
    const record = client([registered, "http://localhost:8080/cb"])
    expect(redirectUriAllowed(record, "http://localhost:8080/cb")).toBe(true)
  })
})

describe("registerClient", () => {
  it("always stores a public client with no secret", async () => {
    await registerClient({
      clientName: "Claude",
      redirectUris: ["https://claude.ai/api/mcp/auth_callback"],
      tokenEndpointAuthMethod: "client_secret_basic",
    })

    const values = h.inserts[0]!
    expect(values.tokenEndpointAuthMethod).toBe("none")
    expect(values.clientSecretHash).toBeNull()
    expect(typeof values.clientId).toBe("string")
    expect((values.clientId as string).length).toBeGreaterThan(20)
  })

  it("drops grant types the server does not implement", async () => {
    await registerClient({
      clientName: "Claude",
      redirectUris: ["https://claude.ai/cb"],
      grantTypes: ["authorization_code", "implicit", "password"],
    })

    expect(h.inserts[0]!.grantTypes).toEqual(["authorization_code"])
  })

  it("defaults to both supported grants and every offered scope", async () => {
    await registerClient({
      clientName: "Claude",
      redirectUris: ["https://claude.ai/cb"],
    })

    expect(h.inserts[0]!.grantTypes).toEqual([
      "authorization_code",
      "refresh_token",
    ])
    expect(h.inserts[0]!.scopes).toEqual([
      "account",
      "dashboard",
      "users.view",
      "settings",
    ])
  })
})
