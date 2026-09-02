import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  CHROME_THEMES,
  CUSTOM_CHROME_HEADER_VARS,
  customChromeVars,
  gradientVars,
  DEFAULT_CHROME_THEME,
  isHexColor,
  resolveChromeTheme,
} from "./chrome-themes"

/**
 * The catalog and the stylesheet are two halves of one contract (`L2-UI-26`):
 * a theme with no CSS block renders as an unstyled shell, and a CSS block with
 * no catalog entry is unreachable. Lock both directions here — neither file
 * imports the other, so nothing else would catch the drift.
 */
const GLOBALS_CSS = readFileSync(
  join(
    import.meta.dirname,
    "../../../../../packages/ui/src/styles/globals.css"
  ),
  "utf8"
)

describe("resolveChromeTheme", () => {
  it("passes through every id in the catalog", () => {
    for (const theme of CHROME_THEMES) {
      expect(resolveChromeTheme(theme.id)).toBe(theme.id)
    }
  })

  it("accepts `custom`, which has no catalog entry by design", () => {
    expect(resolveChromeTheme("custom")).toBe("custom")
    expect(CHROME_THEMES.some((t) => t.id === "custom")).toBe(false)
  })

  it("falls back to default for unknown, empty and missing values", () => {
    expect(resolveChromeTheme("retired-theme")).toBe(DEFAULT_CHROME_THEME)
    expect(resolveChromeTheme("")).toBe(DEFAULT_CHROME_THEME)
    expect(resolveChromeTheme(null)).toBe(DEFAULT_CHROME_THEME)
    expect(resolveChromeTheme(undefined)).toBe(DEFAULT_CHROME_THEME)
  })
})

describe("chrome theme catalog", () => {
  it("has a stylesheet block for every named theme", () => {
    for (const theme of CHROME_THEMES) {
      if (theme.id === DEFAULT_CHROME_THEME) continue
      expect(
        GLOBALS_CSS.includes(`[data-chrome-theme="${theme.id}"]`),
        `${theme.id} has no [data-chrome-theme] block in globals.css`
      ).toBe(true)
    }
  })

  it("has a catalog entry for every stylesheet block", () => {
    const inCss = [
      ...GLOBALS_CSS.matchAll(/\[data-chrome-theme="([a-z-]+)"\]/g),
    ].map((m) => m[1])
    const known = new Set<string>(CHROME_THEMES.map((t) => t.id))
    for (const id of inCss) {
      expect(known.has(id as string), `${id} is styled but not listed`).toBe(
        true
      )
    }
  })

  it("defines the header tokens alongside the sidebar ones", () => {
    // A theme that paints the sidebar but not the header would leave the two
    // halves of the chrome mismatched.
    for (const theme of CHROME_THEMES) {
      if (theme.id === DEFAULT_CHROME_THEME) continue
      const block = GLOBALS_CSS.split(`[data-chrome-theme="${theme.id}"]`)[1]
      expect(block).toBeDefined()
      const body = (block as string).slice(0, (block as string).indexOf("}"))
      expect(body).toContain("--sidebar:")
      expect(body).toContain("--chrome-header:")
      expect(body).toContain("--chrome-header-foreground:")
      // The glass wash is a literal per palette: `color-mix()` built from a
      // `var()` is folded to its first colour by the minifier (`L2-UI-45`).
      expect(body).toContain("--chrome-header-glass:")
    }
  })

  it("paints every named theme with the shared gradient", () => {
    // The recipe is declared once and reached by two selectors — the live
    // sidebar and the picker's `.chrome-gradient` tiles (`L2-UI-44`). A theme
    // opts in by declaring a surface and an accent, which the block above
    // already asserts, so the only drift worth locking is the recipe going
    // missing or losing one of its two consumers.
    expect(GLOBALS_CSS).toContain(".chrome-gradient,")
    expect(GLOBALS_CSS).toContain("--grad-surface: var(--sidebar)")
    expect(GLOBALS_CSS).toContain("--grad-glow: var(--sidebar-accent)")
  })

  it("keeps each theme's gradient stops identical to its stylesheet block", () => {
    // The stops live twice — the CSS block paints the live chrome, the catalog
    // feeds the account preview tile, which cannot read the live shell because
    // it renders inside it (`L2-UI-44`). A drift here shows up as a tile that
    // does not look like the theme it is selling.
    for (const theme of CHROME_THEMES) {
      if (theme.id === DEFAULT_CHROME_THEME) {
        expect(theme.swatch.grad, "default is flat by design").toBeUndefined()
        continue
      }
      const grad = theme.swatch.grad
      expect(grad, `${theme.id} has no gradient stops`).toBeDefined()
      const block = GLOBALS_CSS.split(`[data-chrome-theme="${theme.id}"]`)[1]
      const body = (block as string).slice(0, (block as string).indexOf("}"))
      expect(body, `${theme.id} block`).toContain(`--grad-top: ${grad?.top};`)
      expect(body, `${theme.id} block`).toContain(
        `--grad-bottom: ${grad?.bottom};`
      )
      expect(body, `${theme.id} block`).toContain(`--grad-glow: ${grad?.glow};`)
    }
  })

  it("hands a tile every variable the gradient reads", () => {
    for (const theme of CHROME_THEMES) {
      const vars = gradientVars(theme.swatch)
      if (theme.id === DEFAULT_CHROME_THEME) {
        expect(vars).toEqual({})
        continue
      }
      for (const key of [
        "--grad-surface",
        "--grad-top",
        "--grad-bottom",
        "--grad-glow",
      ]) {
        expect(vars[key], `${theme.id} ${key}`).toBeTruthy()
      }
    }
  })

  it("keeps color-mix out of the gradient recipe", () => {
    // The production minifier folds a `color-mix()` built from `var()`
    // references down to its first colour, which turned the ramp into
    // white → surface → black in the built stylesheet while dev looked right.
    const recipe = GLOBALS_CSS.slice(
      GLOBALS_CSS.indexOf(".chrome-gradient,")
    ).slice(
      0,
      GLOBALS_CSS.slice(GLOBALS_CSS.indexOf(".chrome-gradient,")).indexOf("}")
    )
    expect(recipe).not.toContain("color-mix")
    expect(recipe).toContain("var(--grad-top)")
    expect(recipe).toContain("var(--grad-bottom)")
    expect(recipe).toContain("var(--grad-glow)")
  })

  it("keeps ids unique", () => {
    const ids = CHROME_THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("custom chrome palette", () => {
  it("accepts only #rrggbb", () => {
    expect(isHexColor("#243043")).toBe(true)
    expect(isHexColor("#ABCDEF")).toBe(true)
    expect(isHexColor("243043")).toBe(false)
    expect(isHexColor("#abc")).toBe(false)
    expect(isHexColor("red")).toBe(false)
    expect(isHexColor("#gggggg")).toBe(false)
  })

  it("emits the same variable set a built-in theme block declares", () => {
    const vars = customChromeVars("#243043", "#333b4a")
    // Anything a theme block sets, the custom palette must set too — the rest
    // of the system cannot tell them apart.
    for (const key of [
      "--sidebar",
      "--sidebar-foreground",
      "--sidebar-accent",
      "--sidebar-accent-foreground",
      "--sidebar-border",
      "--sidebar-ring",
      "--chrome-header",
      "--chrome-header-glass",
      "--chrome-header-foreground",
      "--chrome-header-muted",
      "--chrome-header-border",
      "--chrome-header-accent",
    ]) {
      expect(vars[key], `${key} missing`).toBeTruthy()
    }
    expect(vars["--sidebar"]).toBe("#243043")
    expect(vars["--sidebar-accent"]).toBe("#333b4a")
  })

  it("puts light ink on a dark surface and dark ink on a light one", () => {
    expect(
      customChromeVars("#111111", "#222222")["--sidebar-foreground"]
    ).toContain("#fff")
    expect(
      customChromeVars("#f4f1ea", "#e6e0d4")["--sidebar-foreground"]
    ).toContain("#000")
  })

  it("omits the header variables when the header is left plain", () => {
    // They must be absent rather than reset: these ship as inline style, which
    // outranks the `[data-chrome-header="plain"]` rule (`L2-UI-32`).
    const plain = customChromeVars("#243043", "#333b4a", false)
    for (const key of CUSTOM_CHROME_HEADER_VARS) {
      expect(plain[key], `${key} should be absent`).toBeUndefined()
    }
    expect(plain["--sidebar"]).toBe("#243043")

    const themed = customChromeVars("#243043", "#333b4a", true)
    for (const key of CUSTOM_CHROME_HEADER_VARS) {
      expect(themed[key], `${key} should be set`).toBeTruthy()
    }
  })

  it("falls back to the seed colors when handed junk", () => {
    const vars = customChromeVars("not-a-color", "")
    expect(vars["--sidebar"]).toBe("#242a35")
    expect(vars["--sidebar-accent"]).toBe("#333b4a")
  })
})
