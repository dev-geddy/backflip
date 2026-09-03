import { describe, expect, it } from "vitest"

import {
  MAX_PRESET_NAME,
  normalizePresetName,
  samePair,
} from "./chrome-presets"

/**
 * The pure half of the preset feature. The presets themselves are rows in
 * `chrome_preset` (seeded by migration `0018`), so there is no catalog to lock
 * here — only the two rules the UI and the actions both depend on.
 */

describe("normalizePresetName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizePresetName("  Deep   Sea  ")).toBe("Deep Sea")
  })

  it("rejects a name that is empty or only whitespace", () => {
    expect(normalizePresetName("")).toBeNull()
    expect(normalizePresetName("   ")).toBeNull()
    expect(normalizePresetName("\n\t")).toBeNull()
  })

  it("rejects a name past the cap, measured after trimming", () => {
    const long = "x".repeat(MAX_PRESET_NAME + 1)
    expect(normalizePresetName(long)).toBeNull()
    expect(normalizePresetName(`  ${"x".repeat(MAX_PRESET_NAME)}  `)).toBe(
      "x".repeat(MAX_PRESET_NAME)
    )
  })
})

describe("samePair", () => {
  it("ignores hex casing, so a picker value matches a stored one", () => {
    expect(
      samePair(
        { surface: "#1F2530", accent: "#2D3646" },
        { surface: "#1f2530", accent: "#2d3646" }
      )
    ).toBe(true)
  })

  it("is false when either half differs", () => {
    const base = { surface: "#1f2530", accent: "#2d3646" }
    expect(samePair(base, { ...base, accent: "#2d3647" })).toBe(false)
    expect(samePair(base, { ...base, surface: "#1f2531" })).toBe(false)
  })
})
