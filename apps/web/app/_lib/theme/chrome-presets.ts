/**
 * Rules a chrome colour preset has to satisfy. The presets themselves are rows
 * in `chrome_preset` (`L2-DB-37`) — shipped ones seeded as `type = 'system'`,
 * a person's own saved as `type = 'user'` — so there is no catalog here, only
 * the constraints both kinds share.
 *
 * A preset is only ever the two colours actually picked: the surface and the
 * hover/active row. Everything else — ink, borders, ring, gradient stops — is
 * derived by `customChromeVars` (`L2-UI-33`), so a pair saved today keeps
 * working if that derivation changes, and no pair can be unreadable.
 *
 * @spec L2-UI-55
 */

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
