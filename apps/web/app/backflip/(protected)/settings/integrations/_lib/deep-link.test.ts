import { describe, expect, it } from "vitest"

import {
  integrationQuery,
  resolveAiProvider,
  resolveIntegration,
} from "./deep-link"

/**
 * The query string is user-editable and survives in bookmarks, so the
 * resolvers narrow rather than trust (`L2-UI-59`).
 */
describe("resolveIntegration", () => {
  it("keeps a known pane id", () => {
    expect(resolveIntegration("slack")).toBe("slack")
  })

  it("falls back to the first pane for anything else", () => {
    for (const value of [undefined, null, "", "nope", 7, ["ai"]]) {
      expect(resolveIntegration(value)).toBe("ai")
    }
  })
})

describe("resolveAiProvider", () => {
  it("keeps a known provider and narrows the rest", () => {
    expect(resolveAiProvider("openai")).toBe("openai")
    expect(resolveAiProvider("deepseek")).toBe("anthropic")
    expect(resolveAiProvider(undefined)).toBe("anthropic")
  })
})

describe("integrationQuery", () => {
  it("carries the provider only for the AI pane", () => {
    expect(integrationQuery("ai", "google")).toBe(
      "?integration=ai&provider=google"
    )
    // A stale provider beside Slack would be read back on the next load.
    expect(integrationQuery("slack", "google")).toBe("?integration=slack")
    expect(integrationQuery("ai")).toBe("?integration=ai")
  })
})
