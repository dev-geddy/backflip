import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * `clearIntegrationKey` — the only path that takes a credential back out of
 * the platform (`L2-AI-23`). Two properties are worth pinning: it writes
 * nothing at all unless the caller holds `settings` and names a credential the
 * page actually owns, and when it does write it nulls the *encrypted* column
 * while switching the integration off.
 *
 * The db is a recording stub: what matters here is which table got which
 * values, not that Drizzle can build the statement.
 */

type Write = { table: unknown; values: Record<string, unknown> }

const h = vi.hoisted(() => ({
  writes: [] as Write[],
  role: "owner" as string | undefined,
  hasSession: true,
}))

vi.mock("@workspace/db", async () => {
  process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:5432/test"
  process.env.ENCRYPTION_KEY ??= "test-encryption-key"
  const actual =
    await vi.importActual<typeof import("@workspace/db")>("@workspace/db")
  return {
    ...actual,
    db: {
      update: (table: unknown) => ({
        set: (values: Record<string, unknown>) => ({
          where: async () => {
            h.writes.push({ table, values })
          },
        }),
      }),
    },
  }
})

// The action pulls in `server-only` modules (provider fetchers, mask) purely
// by being in the same file; the marker module throws outside a server build.
vi.mock("server-only", () => ({}))

vi.mock("next/cache", () => ({ revalidatePath: () => {} }))

vi.mock("@/app/_lib/auth", () => ({
  auth: async () =>
    h.hasSession ? { user: { id: "u1", role: h.role } } : null,
}))

import { aiConfig, clickupConfig, emailConfig } from "@workspace/db"

import { clearIntegrationKey } from "./_actions"

beforeEach(() => {
  h.writes = []
  h.role = "owner"
  h.hasSession = true
})

describe("clearIntegrationKey", () => {
  it("clears an AI provider's key and drops its enabled + default flags", async () => {
    const res = await clearIntegrationKey("ai:openai")

    expect(res).toEqual({ ok: true, message: "Key removed." })
    expect(h.writes).toHaveLength(1)
    expect(h.writes[0]?.table).toBe(aiConfig)
    expect(h.writes[0]?.values).toMatchObject({
      apiKeyEnc: null,
      enabled: false,
      isDefault: false,
    })
  })

  it("clears the column each integration actually stores its secret in", async () => {
    await clearIntegrationKey("email")
    await clearIntegrationKey("clickup")

    expect(h.writes[0]?.table).toBe(emailConfig)
    expect(h.writes[0]?.values).toMatchObject({
      apiKeyEnc: null,
      enabled: false,
    })
    // ClickUp's column is `apiTokenEnc`; nulling `apiKeyEnc` would silently
    // leave the token in place.
    expect(h.writes[1]?.table).toBe(clickupConfig)
    expect(h.writes[1]?.values).toMatchObject({
      apiTokenEnc: null,
      enabled: false,
    })
  })

  it("never keeps a row's other settings out of reach", async () => {
    await clearIntegrationKey("n8n")

    // Only the credential and the switch move — the instance URL, model
    // choice and addresses are settings, not secrets.
    expect(Object.keys(h.writes[0]?.values ?? {}).sort()).toEqual([
      "apiKeyEnc",
      "enabled",
      "updatedAt",
    ])
  })

  it("refuses an unknown credential id without writing", async () => {
    const res = await clearIntegrationKey("ai:deepseek")

    expect(res).toEqual({ ok: false, message: "Unknown credential" })
    expect(h.writes).toHaveLength(0)
  })

  it("refuses a caller without the settings capability", async () => {
    h.role = "member"
    const res = await clearIntegrationKey("email")

    expect(res).toEqual({ ok: false, message: "Unauthorized" })
    expect(h.writes).toHaveLength(0)
  })

  it("refuses an unauthenticated caller", async () => {
    h.hasSession = false
    const res = await clearIntegrationKey("email")

    expect(res).toEqual({ ok: false, message: "Unauthorized" })
    expect(h.writes).toHaveLength(0)
  })
})
