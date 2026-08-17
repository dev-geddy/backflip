import { afterEach, describe, expect, it, vi } from "vitest"

import {
  ACCESS_TOKEN_TTL_SEC,
  AUTH_CODE_TTL_SEC,
  isMcpEnabled,
  issuerOrigin,
  mcpResourceUrl,
  protectedResourceMetadataUrl,
  REFRESH_TOKEN_TTL_SEC,
} from "./config"

/**
 * The kill switch and the single origin every OAuth document is derived from.
 * Locks `L2-MCP-24` (lifetimes), `L2-MCP-25` (env) and `L2-MCP-37` (default off).
 */

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("isMcpEnabled", () => {
  it('is off unless MCP_ENABLED is exactly "true"', () => {
    vi.stubEnv("MCP_ENABLED", undefined)
    expect(isMcpEnabled()).toBe(false)
    for (const value of ["", "false", "1", "TRUE", "yes"]) {
      vi.stubEnv("MCP_ENABLED", value)
      expect(isMcpEnabled()).toBe(false)
    }
    vi.stubEnv("MCP_ENABLED", "true")
    expect(isMcpEnabled()).toBe(true)
  })
})

describe("issuerOrigin", () => {
  it("reduces AUTH_URL to a bare origin", () => {
    vi.stubEnv("AUTH_URL", "https://app.example.com/")
    expect(issuerOrigin()).toBe("https://app.example.com")

    vi.stubEnv("AUTH_URL", "https://app.example.com/some/path?x=1")
    expect(issuerOrigin()).toBe("https://app.example.com")

    vi.stubEnv("AUTH_URL", "http://localhost:3070")
    expect(issuerOrigin()).toBe("http://localhost:3070")
  })

  it("falls back to the dev origin when AUTH_URL is unset outside production", () => {
    vi.stubEnv("AUTH_URL", undefined)
    vi.stubEnv("NODE_ENV", "development")
    expect(issuerOrigin()).toBe("http://localhost:3070")
  })

  it("throws in production rather than issuing against a guessed origin", () => {
    vi.stubEnv("AUTH_URL", undefined)
    vi.stubEnv("NODE_ENV", "production")
    expect(() => issuerOrigin()).toThrow()
  })
})

describe("derived URLs", () => {
  it("all hang off the same issuer origin", () => {
    vi.stubEnv("AUTH_URL", "https://app.example.com/")
    expect(mcpResourceUrl()).toBe("https://app.example.com/api/mcp")
    expect(protectedResourceMetadataUrl()).toBe(
      "https://app.example.com/.well-known/oauth-protected-resource"
    )
  })
})

describe("lifetimes", () => {
  it("match the contract (60s code, 60min access, 30d refresh)", () => {
    expect(AUTH_CODE_TTL_SEC).toBe(60)
    expect(ACCESS_TOKEN_TTL_SEC).toBe(60 * 60)
    expect(REFRESH_TOKEN_TTL_SEC).toBe(30 * 24 * 60 * 60)
  })
})
