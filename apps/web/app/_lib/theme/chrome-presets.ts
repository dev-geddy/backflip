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

type Pair = { surface: string; accent: string }
type NamedPair = Pair & { id: string; name: string }

/**
 * What the picker's one save control does for the colours currently on screen.
 *
 * `action` is set even when `blocked`, so the button's label is a property of
 * the situation rather than of whether the button happens to be pressable —
 * that is what stops the control from changing identity as you type.
 */
export type PresetSavePlan = {
  /** `create` a new preset, `replace` one held under the same name, or `update` the one being edited. */
  action: "create" | "replace" | "update"
  /** The preset the action lands on, when it lands on one already saved. */
  target: string | null
  /** Why the control cannot run, or null when it can. */
  blocked: "empty" | "unchanged" | "clash" | "full" | null
}

/**
 * Resolve the save control's state from the typed name, the live colours, and
 * the preset (if any) the colours are being edited from.
 *
 * Pure, and deliberately not inside the dialog: this is the whole of the
 * feature's ambiguity — new vs. rename vs. re-colour vs. silent overwrite —
 * and the overwrite in particular has to be named on the button *before* the
 * click, which only works if the rule deciding it is one place.
 *
 * Name comparison is exact, matching the `(userId, name)` unique index: if
 * "brick" and "Brick" are two rows to Postgres, a label promising to replace
 * one of them when the other is meant would be a lie.
 *
 * @spec L2-UI-55
 */
export function planPresetSave({
  name,
  colors,
  origin,
  presets,
}: {
  name: string
  colors: Pair
  /** The user preset being edited, or null when the pair belongs to nothing yet. */
  origin: NamedPair | null
  /** The user's own shelf — system presets are never a save target. */
  presets: NamedPair[]
}): PresetSavePlan {
  const clean = normalizePresetName(name)
  const clash = clean
    ? (presets.find((p) => p.name === clean && p.id !== origin?.id) ?? null)
    : null

  if (origin) {
    if (!clean)
      return { action: "update", target: origin.name, blocked: "empty" }
    if (clash) return { action: "update", target: clash.name, blocked: "clash" }
    if (clean === origin.name && samePair(colors, origin)) {
      return { action: "update", target: origin.name, blocked: "unchanged" }
    }
    return { action: "update", target: origin.name, blocked: null }
  }

  if (!clean) return { action: "create", target: null, blocked: "empty" }
  if (clash) return { action: "replace", target: clash.name, blocked: null }
  if (presets.length >= MAX_SAVED_PRESETS) {
    return { action: "create", target: null, blocked: "full" }
  }
  return { action: "create", target: null, blocked: null }
}
