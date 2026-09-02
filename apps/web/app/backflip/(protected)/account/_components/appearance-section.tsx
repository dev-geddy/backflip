"use client"

import { useState, useTransition } from "react"

import { toast } from "sonner"

import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"
import { RiCheckLine } from "@remixicon/react"

import {
  CHROME_THEMES,
  CUSTOM_CHROME_HEADER_VARS,
  customChromeVars,
  gradientVars,
  type ChromeTheme,
  type ChromeThemeId,
} from "@/app/_lib/theme/chrome-themes"
import {
  saveChromeHeaderGlass,
  saveChromeHeaderThemed,
  saveChromeTheme,
  saveCustomChrome,
} from "../_actions"

const GROUP_LABELS: Record<ChromeTheme["group"], string> = {
  default: "Default",
  dark: "Dark",
  light: "Light",
}

const GROUP_ORDER: ChromeTheme["group"][] = ["default", "dark", "light"]

/** Paint the live shell immediately, before the server round-trip lands. */
function applyToShell(attribute: string, value: string) {
  document
    .querySelector('[data-slot="sidebar-wrapper"]')
    ?.setAttribute(attribute, value)
}

/**
 * Appearance section — picks the admin chrome theme (sidebar + header palette)
 * for the signed-in user. Selecting applies the palette to the live shell at
 * once and persists in the background; a failed save rolls the shell back to
 * what is actually stored, so what you see always matches what is saved.
 *
 * Named themes are fixed palettes — they do not follow the dark-mode toggle.
 * That is what makes them usable as a per-platform identity.
 *
 * @spec L2-UI-25
 */
export function AppearanceSection({
  theme,
  headerThemed,
  headerGlass,
  custom,
}: {
  theme: ChromeThemeId
  headerThemed: boolean
  headerGlass: boolean
  custom: { surface: string; accent: string }
}) {
  const [selected, setSelected] = useState<ChromeThemeId>(theme)
  const [tintHeader, setTintHeader] = useState(headerThemed)
  const [glass, setGlass] = useState(headerGlass)
  const [colors, setColors] = useState(custom)
  const [pending, start] = useTransition()

  /**
   * Repaint the shell with a custom palette without a server round-trip. With
   * the header untinted the `--chrome-header-*` properties are *removed*, not
   * overridden — inline style beats the `[data-chrome-header="plain"]` rule,
   * so leaving them set would pin the header tinted (`L2-UI-33`).
   */
  function applyCustomToShell(
    next: { surface: string; accent: string },
    headerThemed: boolean
  ) {
    const wrapper = document.querySelector<HTMLElement>(
      '[data-slot="sidebar-wrapper"]'
    )
    if (!wrapper) return
    for (const key of CUSTOM_CHROME_HEADER_VARS) {
      wrapper.style.removeProperty(key)
    }
    for (const [key, value] of Object.entries(
      customChromeVars(next.surface, next.accent, headerThemed)
    )) {
      wrapper.style.setProperty(key, value)
    }
  }

  function pickCustomColor(part: "surface" | "accent", value: string) {
    const next = { ...colors, [part]: value }
    setColors(next)
    applyCustomToShell(next, tintHeader)
    if (selected !== "custom") {
      setSelected("custom")
      applyToShell("data-chrome-theme", "custom")
    }

    start(async () => {
      const [colorRes, themeRes] = await Promise.all([
        saveCustomChrome(next.surface, next.accent),
        selected === "custom"
          ? Promise.resolve(null)
          : saveChromeTheme("custom"),
      ])
      const failed = [colorRes, themeRes].find((r) => r && !r.ok)
      if (failed) toast.error(failed.message)
    })
  }

  function choose(next: ChromeThemeId) {
    if (next === selected) return
    const previous = selected
    setSelected(next)
    applyToShell("data-chrome-theme", next)
    if (next === "custom") applyCustomToShell(colors, tintHeader)

    start(async () => {
      const res = await saveChromeTheme(next)
      if (!res?.ok) {
        setSelected(previous)
        applyToShell("data-chrome-theme", previous)
        toast.error(res?.message ?? "Couldn't save the theme.")
      }
    })
  }

  function toggleHeader(next: boolean) {
    setTintHeader(next)
    applyToShell("data-chrome-header", next ? "themed" : "plain")
    // The custom palette lives in inline style, which the attribute rule
    // cannot override — re-emit it so the header actually follows the toggle.
    if (selected === "custom") applyCustomToShell(colors, next)

    start(async () => {
      const res = await saveChromeHeaderThemed(next)
      if (!res?.ok) {
        setTintHeader(!next)
        applyToShell("data-chrome-header", !next ? "themed" : "plain")
        if (selected === "custom") applyCustomToShell(colors, !next)
        toast.error(res?.message ?? "Couldn't save that.")
      }
    })
  }

  function toggleGlass(next: boolean) {
    setGlass(next)
    applyToShell("data-chrome-glass", next ? "on" : "off")

    start(async () => {
      const res = await saveChromeHeaderGlass(next)
      if (!res?.ok) {
        setGlass(!next)
        applyToShell("data-chrome-glass", !next ? "on" : "off")
        toast.error(res?.message ?? "Couldn't save that.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-lg text-sm text-muted-foreground">
          Tints the sidebar and header of this admin only — page content stays
          neutral. Handy when you run several Backflip platforms and want to
          tell them apart at a glance.
        </p>
        {pending ? (
          <span className="flex-none text-xs text-muted-foreground">
            Saving…
          </span>
        ) : null}
      </div>

      {GROUP_ORDER.map((group) => {
        const themes = CHROME_THEMES.filter((t) => t.group === group)
        return (
          <div key={group} className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">
              {GROUP_LABELS[group]}
            </div>
            {/* Three across on desktop. The account column is ~900px wide and
                shares it with a rail, so two is the sensible middle step. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {themes.map((t) => (
                <ThemeTile
                  key={t.id}
                  theme={t}
                  active={selected === t.id}
                  headerThemed={tintHeader}
                  glass={glass}
                  onSelect={() => choose(t.id)}
                />
              ))}
              {group === "default" ? (
                <CustomThemeCard
                  colors={colors}
                  active={selected === "custom"}
                  headerThemed={tintHeader}
                  glass={glass}
                  onSelect={() => choose("custom")}
                  onPick={pickCustomColor}
                />
              ) : null}
            </div>

            {/* Sits directly under Default + Custom: it qualifies how any
                theme below is applied, so it reads before the palettes. */}
            {group === "default" ? (
              <label className="mt-1 flex items-start justify-between gap-4 rounded-lg border bg-muted/40 p-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    Tint the header too
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Off keeps the sidebar themed and lets the top header follow
                    your light/dark setting.
                  </span>
                </span>
                <Switch
                  checked={tintHeader}
                  onCheckedChange={toggleHeader}
                  aria-label="Tint the header too"
                  className="mt-0.5 flex-none"
                />
              </label>
            ) : null}

            {/* Sits with the tint switch because both qualify the header
                rather than pick a palette. Independent of it: a plain header
                can float too (`L2-UI-45`). */}
            {group === "default" ? (
              <label className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 p-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    Float the header over the page
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Pins it to the top so it stays put as you scroll, and frosts
                    it so the page blurs through.
                  </span>
                </span>
                <Switch
                  checked={glass}
                  onCheckedChange={toggleGlass}
                  aria-label="Float the header over the page"
                  className="mt-0.5 flex-none"
                />
              </label>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

const GROUP_CAPTIONS: Record<ChromeTheme["group"], string> = {
  default: "Follows your light/dark setting",
  dark: "Stays dark in either mode",
  light: "Stays light in either mode",
}

function ThemeTile({
  theme,
  active,
  headerThemed,
  glass,
  onSelect,
}: {
  theme: ChromeTheme
  active: boolean
  headerThemed: boolean
  glass: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        // Selection is a 1px border swap — no ring, which would read as a
        // second, thicker outline. The tick beside the label confirms it in
        // plain ink; a filled primary disc was a second, louder signal for a
        // state the border already states.
        "group flex flex-col gap-3 rounded-xl border p-3 text-left transition-colors",
        active
          ? "border-primary"
          : "border-border hover:border-muted-foreground/40"
      )}
    >
      <ShellPreview theme={theme} headerThemed={headerThemed} glass={glass} />

      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {theme.label}
          </span>
          <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
            {GROUP_CAPTIONS[theme.group]}
          </span>
        </span>
        <span
          className={cn(
            "flex size-5 flex-none items-center justify-center rounded-full",
            active ? "text-foreground" : "border border-border"
          )}
        >
          {active ? <RiCheckLine className="size-3.5" /> : null}
        </span>
      </span>
    </button>
  )
}

/**
 * Miniature of the real shell — themed sidebar with an active nav row, themed
 * header strip, neutral content.
 *
 * Every tile paints from inline colors, `default` included. It cannot use
 * `bg-sidebar`: this picker renders *inside* the themed shell, so `--sidebar`
 * here is whatever theme is currently active — the Default tile would show a
 * dark sidebar while a dark theme is selected. `--stock-*` are captured at the
 * root, out of reach of the theme blocks, and still follow light/dark.
 */
function ShellPreview({
  theme,
  headerThemed,
  glass,
}: {
  theme: ChromeTheme
  headerThemed: boolean
  glass: boolean
}) {
  const stock = theme.group === "default"
  const paint = stock
    ? {
        surface: "var(--stock-sidebar)",
        foreground: "var(--stock-sidebar-foreground)",
        accent: "var(--stock-sidebar-accent)",
        edge: "var(--stock-sidebar-border)",
        header: "var(--stock-background)",
        headerInk: "var(--stock-foreground)",
      }
    : {
        surface: theme.swatch.surface,
        foreground: theme.swatch.foreground,
        accent: theme.swatch.accent,
        edge: theme.swatch.accent,
        // Mirrors the live opt-out: with the header untinted the tile shows
        // the stock strip, so the preview never promises more than you get.
        header: headerThemed ? theme.swatch.surface : "var(--stock-background)",
        headerInk: headerThemed
          ? theme.swatch.foreground
          : "var(--stock-foreground)",
      }

  const ink = (opacity: number) => ({
    backgroundColor: paint.foreground,
    opacity,
  })
  const headerInk = (opacity: number) => ({
    backgroundColor: paint.headerInk,
    opacity,
  })

  // The tile mirrors the live chrome's continuation trick (`L2-UI-44`) in
  // miniature: the gradient is painted once on the whole shell box, and the
  // sidebar column and header strip go transparent to let their own slice of
  // it through. Painting each separately would restart the ramp at the seam.
  const gradient = !stock
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-[104px] overflow-hidden rounded-lg border",
        gradient ? "chrome-gradient" : undefined
      )}
      style={{
        borderColor: paint.edge,
        ...(gradient
          ? {
              backgroundColor: paint.surface,
              ...gradientVars(theme.swatch),
            }
          : null),
      }}
    >
      {/* Sidebar */}
      <span
        className="flex w-[34%] flex-col gap-1.5 p-2"
        style={gradient ? undefined : { backgroundColor: paint.surface }}
      >
        {/* Brand row */}
        <span className="flex items-center gap-1 pb-1">
          <span className="size-2.5 flex-none rounded-[3px]" style={ink(0.9)} />
          <span className="h-1.5 flex-1 rounded-full" style={ink(0.7)} />
        </span>

        {/* Active nav row — the accent surface, as in the real sidebar */}
        <span
          className="flex items-center gap-1 rounded-[3px] px-1 py-1"
          style={{ backgroundColor: paint.accent }}
        >
          <span className="size-1.5 flex-none rounded-[1px]" style={ink(0.9)} />
          <span className="h-1 flex-1 rounded-full" style={ink(0.9)} />
        </span>

        {/* Idle nav rows */}
        {[0.45, 0.45, 0.3].map((opacity, i) => (
          <span key={i} className="flex items-center gap-1 px-1">
            <span
              className="size-1.5 flex-none rounded-[1px]"
              style={ink(opacity)}
            />
            <span
              className={cn("h-1 rounded-full", i === 2 ? "w-1/2" : "flex-1")}
              style={ink(opacity)}
            />
          </span>
        ))}
      </span>

      {/* Content column: themed header strip over neutral page content */}
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className="flex h-[22px] flex-none items-center gap-1 px-2"
          style={{
            // Glass thins the strip so the surface behind shows through, the
            // one part of `L2-UI-45` a static miniature can honestly show.
            backgroundColor:
              gradient && headerThemed && !glass
                ? "transparent"
                : glass
                  ? `color-mix(in oklab, ${paint.header} 72%, transparent)`
                  : paint.header,
          }}
        >
          <span className="h-1 w-6 rounded-full" style={headerInk(0.5)} />
          <span className="flex-1" />
          <span className="size-1.5 rounded-full" style={headerInk(0.4)} />
          <span className="size-1.5 rounded-full" style={headerInk(0.4)} />
        </span>

        {/* Page content is never tinted by a theme — the stock canvas shows
            that, in every tile. */}
        <span
          className="flex flex-1 flex-col gap-1.5 p-2"
          style={{ backgroundColor: "var(--stock-background)" }}
        >
          <span
            className="h-1.5 w-2/3 rounded-full"
            style={{ backgroundColor: "var(--stock-foreground)", opacity: 0.2 }}
          />
          <span
            className="flex-1 rounded-[3px] border"
            style={{ borderColor: "var(--stock-sidebar-border)" }}
          />
        </span>
      </span>
    </span>
  )
}

/**
 * Custom theme — the one card that is also an editor. Spans the two grid
 * columns the Default tile leaves free, so the first row reads as "stock, or
 * roll your own".
 *
 * Only the surface and accent are chosen; ink, border and ring are derived
 * from them (`customChromeVars`), which is what keeps any pick readable. The
 * inputs commit on `change`, not `input` — dragging through a colour wheel
 * would otherwise fire a write per frame.
 */
function CustomThemeCard({
  colors,
  active,
  headerThemed,
  glass,
  onSelect,
  onPick,
}: {
  colors: { surface: string; accent: string }
  active: boolean
  headerThemed: boolean
  glass: boolean
  onSelect: () => void
  onPick: (part: "surface" | "accent", value: string) => void
}) {
  const vars = customChromeVars(colors.surface, colors.accent)
  const preview: ChromeTheme = {
    id: "custom",
    label: "Custom",
    group: "dark",
    swatch: {
      surface: vars["--sidebar"] as string,
      foreground: vars["--sidebar-foreground"] as string,
      accent: vars["--sidebar-accent"] as string,
      grad: {
        top: vars["--grad-top"] as string,
        bottom: vars["--grad-bottom"] as string,
        glow: vars["--grad-glow"] as string,
      },
    },
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-3 sm:col-span-2",
        active ? "border-primary" : "border-border"
      )}
    >
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={active}
          className="min-w-0 flex-1 text-left"
        >
          <ShellPreview
            theme={preview}
            headerThemed={headerThemed}
            glass={glass}
          />
        </button>

        <div className="flex w-[150px] flex-none flex-col gap-2">
          <ColorInput
            id="custom-surface"
            label="Sidebar"
            value={colors.surface}
            onChange={(v) => onPick("surface", v)}
          />
          <ColorInput
            id="custom-accent"
            label="Active row"
            value={colors.accent}
            onChange={(v) => onPick("accent", v)}
          />
          <p className="text-[11px] leading-tight text-muted-foreground">
            Text and borders are derived, so they stay readable.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="flex items-start justify-between gap-2 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">Custom</span>
          <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
            Your own two colours, fixed in either mode
          </span>
        </span>
        <span
          className={cn(
            "flex size-5 flex-none items-center justify-center rounded-full",
            active ? "text-foreground" : "border border-border"
          )}
        >
          {active ? <RiCheckLine className="size-3.5" /> : null}
        </span>
      </button>
    </div>
  )
}

function ColorInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 rounded-md border px-2 py-1.5"
    >
      <input
        id={id}
        type="color"
        defaultValue={value}
        onChange={(event) => onChange(event.target.value)}
        className="size-5 flex-none cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <span className="min-w-0 flex-1 truncate text-xs">{label}</span>
      <span className="font-mono text-[10px] text-muted-foreground uppercase">
        {value.replace("#", "")}
      </span>
    </label>
  )
}
