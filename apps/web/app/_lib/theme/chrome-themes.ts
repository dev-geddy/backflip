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
 * Saturation stays low — ≤ 0.10 on the dark surfaces, ≤ 0.03 on the light
 * ones. Enough hue that the themes are told apart at a glance, far short of
 * anything that competes with page content or tires the eye over a working
 * day. Aubergine sits at the top of that range on purpose: below ~0.08 a plum
 * reads as grey-violet rather than as a colour.
 *
 * @spec L2-UI-26
 */

export type ChromeThemeId =
  | "default"
  | "custom"
  | "slate"
  | "graphite"
  | "pine"
  | "aubergine"
  | "gold"
  | "sky-blue"
  | "sage"
  | "rose-gold"

export type ChromeTheme = {
  id: ChromeThemeId
  label: string
  /** Grouping in the picker. `default` is its own group of one. */
  group: "default" | "dark" | "light"
  /**
   * Preview swatch: sidebar surface + its foreground, as CSS colors, plus the
   * three stops the chrome gradient ramps between (`L2-UI-44`). The stops
   * duplicate what the theme's stylesheet block declares — a preview tile
   * cannot read them off the live shell, because it renders *inside* it — and
   * `chrome-themes.test.ts` locks the two copies together.
   */
  swatch: {
    surface: string
    foreground: string
    accent: string
    grad?: { top: string; bottom: string; glow: string }
  }
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
      grad: {
        top: "oklch(0.271 0.026 258)",
        bottom: "oklch(0.215 0.026 258)",
        glow: "oklch(0.369 0.031 258 / 0.5)",
      },
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
      grad: {
        top: "oklch(0.24 0 0)",
        bottom: "oklch(0.184 0 0)",
        glow: "oklch(0.338 0 0 / 0.5)",
      },
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
      grad: {
        top: "oklch(0.268 0.047 173)",
        bottom: "oklch(0.212 0.047 173)",
        glow: "oklch(0.366 0.054 173 / 0.5)",
      },
    },
  },
  {
    id: "aubergine",
    label: "Aubergine",
    group: "dark",
    swatch: {
      surface: "oklch(0.262 0.086 325)",
      foreground: "oklch(0.966 0.014 325)",
      accent: "oklch(0.324 0.098 325)",
      grad: {
        top: "oklch(0.286 0.086 325)",
        bottom: "oklch(0.23 0.086 325)",
        glow: "oklch(0.384 0.098 325 / 0.5)",
      },
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
      grad: {
        top: "oklch(0.973 0.021 84)",
        bottom: "oklch(0.935 0.021 84)",
        glow: "oklch(0.921 0.032 84 / 0.35)",
      },
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
      grad: {
        top: "oklch(0.971 0.018 246)",
        bottom: "oklch(0.933 0.018 246)",
        glow: "oklch(0.918 0.028 246 / 0.35)",
      },
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
      grad: {
        top: "oklch(0.969 0.021 154)",
        bottom: "oklch(0.931 0.021 154)",
        glow: "oklch(0.915 0.031 154 / 0.35)",
      },
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
      grad: {
        top: "oklch(0.972 0.02 22)",
        bottom: "oklch(0.934 0.02 22)",
        glow: "oklch(0.92 0.03 22 / 0.35)",
      },
    },
  },
]

/**
 * Inputs for the shared chrome gradient (`.chrome-gradient` in `globals.css`),
 * as a style object for a preview tile. The recipe itself lives in CSS and is
 * declared exactly once — a tile only supplies the stops it ramps between.
 *
 * The stops are explicit rather than derived with `color-mix()`: the
 * production CSS minifier folds a `color-mix()` whose arguments are `var()`
 * references down to its first colour, which silently turned the built ramp
 * into white → surface → black while it looked right in dev.
 *
 * The live shell needs none of this: its rule reads `--sidebar` and
 * `--sidebar-accent` straight off the active theme, custom palettes included.
 *
 * @spec L2-UI-44
 */
export function gradientVars(
  swatch: ChromeTheme["swatch"]
): Record<string, string> {
  if (!swatch.grad) return {}
  return {
    "--grad-surface": swatch.surface,
    "--grad-top": swatch.grad.top,
    "--grad-bottom": swatch.grad.bottom,
    "--grad-glow": swatch.grad.glow,
  }
}

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

  // The gradient stops (`L2-UI-44`). A named theme lists these literally in
  // its stylesheet block, because the production minifier folds a `color-mix()`
  // built from `var()` references; here they are derived and shipped as inline
  // style, which no build step rewrites, so `color-mix()` is safe.
  const gradient = {
    "--grad-surface": safeSurface,
    "--grad-top": `color-mix(in oklab, #fff 6%, ${safeSurface})`,
    "--grad-bottom": `color-mix(in oklab, #000 10%, ${safeSurface})`,
    "--grad-glow": `color-mix(in oklab, ${safeAccent} 50%, transparent)`,
  }

  const sidebar = {
    ...gradient,
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
    // Inline style is never minified, so `color-mix()` is safe here; a named
    // theme has to spell the same wash out literally (`L2-UI-45`).
    // The glass wash (`L2-UI-45`). The backdrop-correcting filter is NOT set
    // here: it depends on the app's light/dark mode as well as the palette's
    // tone, which inline style cannot express — the layout stamps
    // `data-chrome-tone` instead and CSS picks the chain.
    "--chrome-header-glass": `color-mix(in oklab, ${safeSurface} 80%, transparent)`,
    "--chrome-header-foreground": ink,
    "--chrome-header-muted": muted,
    "--chrome-header-border": border,
    "--chrome-header-accent": safeAccent,
  }
}

/**
 * Which glass filter chain a theme takes (`L2-UI-45`): the chains are keyed on
 * tone × app mode, and only the tone is knowable on the server. `default` has
 * no fixed tone — it follows the mode — so it gets no attribute and falls
 * through to the stock chain.
 */
export function chromeToneOf(
  theme: ChromeThemeId,
  customSurface?: string | null
): "dark" | "light" | undefined {
  if (theme === "custom") {
    const surface =
      customSurface && isHexColor(customSurface)
        ? customSurface
        : CUSTOM_CHROME_SEED.surface
    // Same threshold the ink uses, so tone and ink can never disagree.
    return luminance(surface) > 0.45 ? "light" : "dark"
  }
  const group = CHROME_THEMES.find((t) => t.id === theme)?.group
  return group === "dark" || group === "light" ? group : undefined
}

/** The header-only half of a custom palette — what the toggle adds/removes. */
export const CUSTOM_CHROME_HEADER_VARS = [
  "--chrome-header",
  "--chrome-header-glass",
  "--chrome-header-foreground",
  "--chrome-header-muted",
  "--chrome-header-border",
  "--chrome-header-accent",
] as const
