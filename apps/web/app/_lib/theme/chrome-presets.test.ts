import { describe, expect, it } from "vitest"

import {
  MAX_PRESET_NAME,
  MAX_SAVED_PRESETS,
  normalizePresetName,
  planPresetSave,
  samePair,
} from "./chrome-presets"

/**
 * The pure half of the preset feature. The presets themselves are rows in
 * `chrome_preset` (seeded by migration `0018`), so there is no catalog to lock
 * here — only the rules the UI and the actions both depend on.
 *
 * `planPresetSave` is the one worth the coverage: it decides whether a click
 * creates, overwrites or edits, and the dialog prints that decision on the
 * button. A wrong answer here is a preset silently destroyed.
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

describe("planPresetSave", () => {
  const brick = {
    id: "1",
    name: "Brick",
    surface: "#6b2424",
    accent: "#933939",
  }
  const moss = { id: "2", name: "Moss", surface: "#246b24", accent: "#399339" }
  const presets = [brick, moss]
  const other = { surface: "#101010", accent: "#202020" }

  it("creates when the name is new and the pair belongs to nothing", () => {
    expect(
      planPresetSave({ name: "Ocean", colors: other, origin: null, presets })
    ).toEqual({ action: "create", target: null, blocked: null })
  })

  it("calls an overwrite an overwrite, so the button can say so", () => {
    expect(
      planPresetSave({ name: "Brick", colors: other, origin: null, presets })
    ).toEqual({ action: "replace", target: "Brick", blocked: null })
  })

  it("normalizes the typed name before matching, as the server does", () => {
    expect(
      planPresetSave({ name: "  Brick ", colors: other, origin: null, presets })
    ).toEqual({ action: "replace", target: "Brick", blocked: null })
  })

  it("matches names exactly, mirroring the (userId, name) unique index", () => {
    expect(
      planPresetSave({ name: "brick", colors: other, origin: null, presets })
    ).toEqual({ action: "create", target: null, blocked: null })
  })

  it("blocks an empty name without changing what the button would do", () => {
    expect(
      planPresetSave({ name: "   ", colors: other, origin: null, presets })
    ).toEqual({ action: "create", target: null, blocked: "empty" })
    expect(
      planPresetSave({ name: "", colors: other, origin: brick, presets })
    ).toEqual({ action: "update", target: "Brick", blocked: "empty" })
  })

  it("blocks a new preset at the cap, but never an edit to one already held", () => {
    const full = Array.from({ length: MAX_SAVED_PRESETS }, (_, i) => ({
      id: String(i),
      name: `P${i}`,
      surface: "#000000",
      accent: "#111111",
    }))
    expect(
      planPresetSave({
        name: "Ocean",
        colors: other,
        origin: null,
        presets: full,
      })
    ).toEqual({ action: "create", target: null, blocked: "full" })
    expect(
      planPresetSave({ name: "P0", colors: other, origin: null, presets: full })
    ).toEqual({ action: "replace", target: "P0", blocked: null })
    expect(
      planPresetSave({
        name: "P0",
        colors: other,
        origin: full[0]!,
        presets: full,
      })
    ).toEqual({ action: "update", target: "P0", blocked: null })
  })

  it("updates the preset being edited when its colours moved on", () => {
    expect(
      planPresetSave({ name: "Brick", colors: other, origin: brick, presets })
    ).toEqual({ action: "update", target: "Brick", blocked: null })
  })

  it("updates the preset being edited when only its name moved on", () => {
    expect(
      planPresetSave({ name: "Clay", colors: brick, origin: brick, presets })
    ).toEqual({ action: "update", target: "Brick", blocked: null })
  })

  it("has nothing to do when name and colours both match the edited preset", () => {
    expect(
      planPresetSave({ name: "Brick", colors: brick, origin: brick, presets })
    ).toEqual({ action: "update", target: "Brick", blocked: "unchanged" })
  })

  it("refuses a rename onto a name another preset holds", () => {
    expect(
      planPresetSave({ name: "Moss", colors: other, origin: brick, presets })
    ).toEqual({ action: "update", target: "Moss", blocked: "clash" })
  })
})
