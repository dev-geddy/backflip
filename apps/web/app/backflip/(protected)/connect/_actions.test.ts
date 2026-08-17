import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The connector kill switch on the consent/account server actions
 * (`L2-MCP-37`). A server action is POST-invocable by its action id and does
 * NOT inherit the `isMcpEnabled()` guard on `/backflip/connect`, so each action
 * has to assert the flag itself — otherwise a connector disabled after clients
 * had already registered could still be handed a fresh authorization code.
 *
 * Everything below the flag is stubbed; the flag is the whole assertion.
 */

const NOT_FOUND = "NEXT_NOT_FOUND"

vi.mock("@workspace/db", async () => {
  process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:5432/test"
  const actual =
    await vi.importActual<typeof import("@workspace/db")>("@workspace/db")
  return { ...actual, db: {} }
})

vi.mock("next/cache", () => ({ revalidatePath: () => {} }))

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error(NOT_FOUND)
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

const h = vi.hoisted(() => ({ guardCalls: 0 }))

vi.mock("@/app/_lib/auth/guard", () => ({
  requireCapability: async () => {
    h.guardCalls++
    return { id: "user-1", role: "owner", email: "owner@example.com" }
  },
}))

import {
  approveAuthorization,
  denyAuthorization,
  disconnectConnection,
} from "./_actions"

const ACTIONS: Array<[string, (formData: FormData) => Promise<void>]> = [
  ["approveAuthorization", approveAuthorization],
  ["denyAuthorization", denyAuthorization],
  ["disconnectConnection", disconnectConnection],
]

beforeEach(() => {
  h.guardCalls = 0
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe.each(ACTIONS)("%s", (_name, action) => {
  it("404s while MCP_ENABLED is unset, before touching the session", async () => {
    vi.stubEnv("MCP_ENABLED", undefined)
    await expect(action(new FormData())).rejects.toThrow(NOT_FOUND)
    expect(h.guardCalls).toBe(0)
  })

  it("404s for any value other than the exact opt-in", async () => {
    vi.stubEnv("MCP_ENABLED", "1")
    await expect(action(new FormData())).rejects.toThrow(NOT_FOUND)
  })

  it("runs the session check once the connector is enabled", async () => {
    vi.stubEnv("MCP_ENABLED", "true")
    // Empty form → the action bails further down (fatal validation / no
    // clientId); all that matters here is that it got past the switch.
    await action(new FormData()).catch(() => {})
    expect(h.guardCalls).toBe(1)
  })
})
