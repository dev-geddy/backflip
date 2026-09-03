/**
 * Colour pairs for the `custom` chrome theme — the ones Backflip ships, plus
 * the rules a user's own saved pair has to satisfy.
 *
 * A preset is only ever the two colours a user actually picks: the surface and
 * the hover/active row. Everything else — ink, borders, ring, gradient stops —
 * is derived by `customChromeVars` (`L2-UI-33`), so a pair saved today keeps
 * working if that derivation changes, and no pair can be unreadable.
 *
 * The built-ins follow the same discipline as the named palettes (`L2-UI-26`):
 * saturation low enough that the chrome never competes with page content, and
 * the accent set far enough from its surface to be findable — lighter than the
 * surface on the dark pairs, darker on the light ones. They are deliberately
 * *not* duplicates of the named themes; a user who wanted Slate would pick
 * Slate. These are the starting points that palette doesn't cover.
 *
 * @spec L2-UI-55
 */

export type ChromePreset = {
  /** Stable id — built-ins only. Saved presets are keyed by their row id. */
  id: string
  name: string
  tone: "dark" | "light"
  surface: string
  accent: string
}

export const BUILT_IN_CHROME_PRESETS: ChromePreset[] = [
  {
    id: "midnight",
    name: "Midnight",
    tone: "dark",
    surface: "#1f2530",
    accent: "#2d3646",
  },
  {
    id: "forest",
    name: "Forest",
    tone: "dark",
    surface: "#1e2b26",
    accent: "#2b3d35",
  },
  {
    id: "plum",
    name: "Plum",
    tone: "dark",
    surface: "#2b2233",
    accent: "#3b2f47",
  },
  {
    id: "espresso",
    name: "Espresso",
    tone: "dark",
    surface: "#2a2622",
    accent: "#3a352f",
  },
  {
    id: "linen",
    name: "Linen",
    tone: "light",
    surface: "#f4f1ea",
    accent: "#e4ded1",
  },
  {
    id: "mist",
    name: "Mist",
    tone: "light",
    surface: "#eef1f5",
    accent: "#dde3ec",
  },
  {
    id: "blush",
    name: "Blush",
    tone: "light",
    surface: "#f6efee",
    accent: "#ead9d7",
  },
  {
    id: "meadow",
    name: "Meadow",
    tone: "light",
    surface: "#edf2ec",
    accent: "#d9e5d8",
  },
]

/**
 * Ceiling on saved presets per user. Not a scarcity rule — a shelf of colour
 * swatches stops being browsable long before this, and it keeps one account
 * from growing the table without bound.
 */
export const MAX_SAVED_PRESETS = 24

/** Longest a preset name may be. Long enough to be descriptive, short enough to fit its chip. */
export const MAX_PRESET_NAME = 32

/**
 * Normalize a submitted preset name: collapse whitespace, trim. Returns null
 * when nothing usable is left, so the caller can reject without a second rule.
 */
export function normalizePresetName(input: string): string | null {
  const name = input.replace(/\s+/g, " ").trim()
  if (!name || name.length > MAX_PRESET_NAME) return null
  return name
}

/** Whether a pair already exists in a list — used to mark the active swatch. */
export function samePair(
  a: { surface: string; accent: string },
  b: { surface: string; accent: string }
): boolean {
  return (
    a.surface.toLowerCase() === b.surface.toLowerCase() &&
    a.accent.toLowerCase() === b.accent.toLowerCase()
  )
}
