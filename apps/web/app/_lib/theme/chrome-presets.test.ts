import { describe, expect, it } from "vitest"

import {
  BUILT_IN_CHROME_PRESETS,
  MAX_PRESET_NAME,
  normalizePresetName,
  samePair,
} from "./chrome-presets"
import { isHexColor } from "./chrome-themes"

/**
 * The pure half of the preset feature. The built-ins are locked here rather
 * than trusted: they ship as plain strings, and `customChromeVars` silently
 * falls back to the seed palette for anything that is not `#rrggbb`, so a typo
 * would render as "the preset does nothing" instead of as an error.
 */

describe("BUILT_IN_CHROME_PRESETS", () => {
  it("are all valid hex pairs", () => {
    for (const preset of BUILT_IN_CHROME_PRESETS) {
      expect(isHexColor(preset.surface), preset.name).toBe(true)
      expect(isHexColor(preset.accent), preset.name).toBe(true)
    }
  })

  it("have unique ids and names", () => {
    const ids = BUILT_IN_CHROME_PRESETS.map((p) => p.id)
    const names = BUILT_IN_CHROME_PRESETS.map((p) => p.name)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(names).size).toBe(names.length)
  })

  it("never pair a surface with itself — the active row has to be findable", () => {
    for (const preset of BUILT_IN_CHROME_PRESETS) {
      expect(preset.surface.toLowerCase(), preset.name).not.toBe(
        preset.accent.toLowerCase()
      )
    }
  })
})

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
