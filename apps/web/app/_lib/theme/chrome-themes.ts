/**
 * Admin shell chrome themes — the Slack-style sidebar + header palettes a user
 * picks in `/backflip/account`. Each id matches a `[data-chrome-theme="…"]`
 * block in `packages/ui/src/styles/globals.css`; this module is the single
 * source of truth for which ids exist, what they are called, and the swatch
 * colors the picker previews.
 *
 * Named themes are **fixed palettes**: a dark theme stays dark when the app is
 * in light mode, and vice versa. Only `default` follows the light/dark toggle.
 * That is the point — the chrome is how you tell two Backflip platforms apart
 * at a glance, so it must not change under you when the mode flips.
 *
 * Saturation stays low (chroma ≤ 0.06) — enough hue that four dark themes are
 * told apart at a glance, far short of anything that competes with page
 * content or tires the eye over a working day.
 *
 * @spec L2-UI-26
 */

export type ChromeThemeId =
  | "default"
  | "custom"
  | "slate"
  | "graphite"
  | "pine"
  | "gold"
  | "sky-blue"
  | "sage"
  | "rose-gold"

export type ChromeTheme = {
  id: ChromeThemeId
  label: string
  /** Grouping in the picker. `default` is its own group of one. */
  group: "default" | "dark" | "light"
  /** Preview swatch: sidebar surface + its foreground, as CSS colors. */
  swatch: { surface: string; foreground: string; accent: string }
}

export const CHROME_THEMES: ChromeTheme[] = [
  {
    id: "default",
    label: "Default",
    group: "default",
    // The only theme whose swatch can't be one fixed pair — it follows the
    // light/dark toggle. The picker renders it as a split tile instead.
    swatch: {
      surface: "oklch(0.985 0 0)",
      foreground: "oklch(0.145 0 0)",
      accent: "oklch(0.97 0 0)",
    },
  },

  {
    id: "slate",
    label: "Slate",
    group: "dark",
    swatch: {
      surface: "oklch(0.247 0.026 258)",
      foreground: "oklch(0.966 0.006 258)",
      accent: "oklch(0.309 0.031 258)",
    },
  },
  {
    id: "graphite",
    label: "Graphite",
    group: "dark",
    swatch: {
      surface: "oklch(0.216 0 0)",
      foreground: "oklch(0.968 0 0)",
      accent: "oklch(0.278 0 0)",
    },
  },
  {
    id: "pine",
    label: "Pine",
    group: "dark",
    swatch: {
      surface: "oklch(0.244 0.047 173)",
      foreground: "oklch(0.964 0.011 173)",
      accent: "oklch(0.306 0.054 173)",
    },
  },

  {
    id: "gold",
    label: "Gold",
    group: "light",
    swatch: {
      surface: "oklch(0.961 0.021 84)",
      foreground: "oklch(0.271 0.019 84)",
      accent: "oklch(0.921 0.032 84)",
    },
  },
  {
    id: "sky-blue",
    label: "Sky Blue",
    group: "light",
    swatch: {
      surface: "oklch(0.959 0.018 246)",
      foreground: "oklch(0.268 0.019 246)",
      accent: "oklch(0.918 0.028 246)",
    },
  },
  {
    id: "sage",
    label: "Sage",
    group: "light",
    swatch: {
      surface: "oklch(0.957 0.021 154)",
      foreground: "oklch(0.266 0.021 154)",
      accent: "oklch(0.915 0.031 154)",
    },
  },
  {
    id: "rose-gold",
    label: "Rose Gold",
    group: "light",
    swatch: {
      surface: "oklch(0.96 0.02 22)",
      foreground: "oklch(0.27 0.02 22)",
      accent: "oklch(0.92 0.03 22)",
    },
  },
]

// `custom` is deliberately absent from CHROME_THEMES — it renders as its own
// card, not a swatch tile — but it is still a storable, resolvable id.
const IDS = new Set<string>([...CHROME_THEMES.map((t) => t.id), "custom"])

export const DEFAULT_CHROME_THEME: ChromeThemeId = "default"

/**
 * Narrow a stored/submitted value to a known theme id. Anything unknown — a
 * retired theme, a hand-edited row, a forged form field — falls back to
 * `default` instead of rendering an unstyled shell.
 */
export function resolveChromeTheme(value: string | null | undefined) {
  return value && IDS.has(value)
    ? (value as ChromeThemeId)
    : DEFAULT_CHROME_THEME
}

/* ----------------------------- Custom theme ------------------------------ *
 * `custom` has no CSS block: its palette is user-chosen, so the layout emits
 * the same variables inline instead. Two colors are stored — the chrome
 * surface and the accent (hover/active) — and everything else is derived, so
 * a user cannot pick an unreadable combination.
 * -------------------------------------------------------------------------- */

/** Seed colors for a user who selects Custom before picking anything. */
export const CUSTOM_CHROME_SEED = {
  surface: "#242a35",
  accent: "#333b4a",
}

const HEX = /^#[0-9a-f]{6}$/i

export function isHexColor(value: string): boolean {
  return HEX.test(value)
}

/**
 * Relative luminance (WCAG) of a `#rrggbb` color, 0–1. Used only to decide
 * whether a surface takes light or dark ink.
 */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2)
}

/**
 * Ink for a surface: near-white on dark, near-black on light, mixed with the
 * surface itself so the text keeps the palette's hue instead of going flatly
 * neutral. 0.45 rather than 0.5 — mid greens read brighter than their
 * luminance suggests, and erring toward light ink is the safer miss.
 */
function inkFor(surface: string): string {
  return luminance(surface) > 0.45
    ? `color-mix(in oklab, #000 84%, ${surface})`
    : `color-mix(in oklab, #fff 94%, ${surface})`
}

/**
 * The full chrome variable set for a custom palette, ready to spread onto the
 * shell wrapper's `style`. Mirrors exactly what a `[data-chrome-theme]` block
 * declares, so the rest of the system cannot tell the two apart.
 */
export function customChromeVars(
  surface: string,
  accent: string,
  /**
   * When false the header keeps the plain light/dark chrome (`L2-UI-32`) and
   * the `--chrome-header-*` entries are omitted entirely. They have to be
   * *absent*, not overridden: these variables ship as inline style on the
   * shell wrapper, and inline style outranks the `[data-chrome-header="plain"]`
   * rule that would otherwise point them back at the stock palette.
   */
  headerThemed = true
): Record<string, string> {
  const safeSurface = isHexColor(surface) ? surface : CUSTOM_CHROME_SEED.surface
  const safeAccent = isHexColor(accent) ? accent : CUSTOM_CHROME_SEED.accent
  const ink = inkFor(safeSurface)
  const accentInk = inkFor(safeAccent)
  // Border and ring stay in the family: the surface lifted toward its own ink,
  // at the same weights the built-in palettes use.
  const border = `color-mix(in oklab, ${ink} 18%, ${safeSurface})`
  const muted = `color-mix(in oklab, ${ink} 62%, ${safeSurface})`

  const sidebar = {
    "--sidebar": safeSurface,
    "--sidebar-foreground": ink,
    "--sidebar-primary": ink,
    "--sidebar-primary-foreground": safeSurface,
    "--sidebar-accent": safeAccent,
    "--sidebar-accent-foreground": accentInk,
    "--sidebar-border": border,
    "--sidebar-ring": `color-mix(in oklab, ${ink} 45%, ${safeSurface})`,
  }
  if (!headerThemed) return sidebar

  return {
    ...sidebar,
    "--chrome-header": safeSurface,
    "--chrome-header-foreground": ink,
    "--chrome-header-muted": muted,
    "--chrome-header-border": border,
    "--chrome-header-accent": safeAccent,
  }
}

/** The header-only half of a custom palette — what the toggle adds/removes. */
export const CUSTOM_CHROME_HEADER_VARS = [
  "--chrome-header",
  "--chrome-header-foreground",
  "--chrome-header-muted",
  "--chrome-header-border",
  "--chrome-header-accent",
] as const
