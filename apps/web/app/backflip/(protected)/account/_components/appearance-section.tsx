"use client"

import { useState, useTransition } from "react"

import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"
import { RiCheckLine } from "@remixicon/react"

import {
  CHROME_THEMES,
  CUSTOM_CHROME_HEADER_VARS,
  customChromeVars,
  type ChromeTheme,
  type ChromeThemeId,
} from "@/app/_lib/theme/chrome-themes"
import type { SavedChromePreset } from "@/app/_lib/theme/preferences"
import {
  saveChromeHeaderGlass,
  saveChromeHeaderThemed,
  saveChromeTheme,
  saveCustomChrome,
} from "../_actions"
import { CustomThemeDialog } from "./custom-theme-dialog"
import { ShellPreview } from "./shell-preview"

const GROUP_LABELS: Record<ChromeTheme["group"], string> = {
  default: "Default",
  dark: "Dark",
  light: "Light",
}

/**
 * Only the default group renders on the page. The eight fixed palettes moved
 * into the dialog (`L2-UI-55`) — they are a browsing task, and eight preview
 * tiles pushed the rest of the account settings below the fold.
 */
const GROUP_ORDER: ChromeTheme["group"][] = ["default"]

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
  presets,
}: {
  theme: ChromeThemeId
  headerThemed: boolean
  headerGlass: boolean
  custom: { surface: string; accent: string }
  presets: SavedChromePreset[]
}) {
  const [selected, setSelected] = useState<ChromeThemeId>(theme)
  const [tintHeader, setTintHeader] = useState(headerThemed)
  const [glass, setGlass] = useState(headerGlass)
  const [colors, setColors] = useState(custom)
  const [editorOpen, setEditorOpen] = useState(false)
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

  /**
   * Commit a whole palette: both colours at once, plus the switch to `custom`
   * if some named theme was active. One write, so applying a preset cannot
   * leave the surface saved and the accent not.
   */
  function applyCustomPair(next: { surface: string; accent: string }) {
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

  function pickCustomColor(part: "surface" | "accent", value: string) {
    applyCustomPair({ ...colors, [part]: value })
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
        <div className="flex flex-none items-center gap-3">
          {pending ? (
            <span className="text-xs text-muted-foreground">Saving…</span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditorOpen(true)}
          >
            Browse themes…
          </Button>
        </div>
      </div>

      <CustomThemeDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        selected={selected}
        colors={colors}
        saved={presets}
        headerThemed={tintHeader}
        glass={glass}
        onPick={pickCustomColor}
        onApplyPair={applyCustomPair}
      />

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
                  onCustomize={() => setEditorOpen(true)}
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
 * Custom theme — the one card that is also an entry point. Spans the two grid
 * columns the Default tile leaves free, so the first row reads as "stock, or
 * roll your own".
 *
 * The card shows the live palette and nothing else; picking colours, browsing
 * presets and saving your own all happen in `CustomThemeDialog`. Inline, that
 * shelf would double the height of this section for something most people open
 * once (`L2-UI-55`).
 */
function CustomThemeCard({
  colors,
  active,
  headerThemed,
  glass,
  onSelect,
  onCustomize,
}: {
  colors: { surface: string; accent: string }
  active: boolean
  headerThemed: boolean
  glass: boolean
  onSelect: () => void
  onCustomize: () => void
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

        <div className="flex w-[150px] flex-none flex-col justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <Pair label="Sidebar" color={colors.surface} />
            <Pair label="Active row" color={colors.accent} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onCustomize}
          >
            Customize…
          </Button>
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

/** Read-only echo of one chosen colour — the card states, the dialog edits. */
function Pair({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-center gap-2 rounded-md border px-2 py-1.5">
      <span
        className="size-5 flex-none rounded border"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0 flex-1 truncate text-xs">{label}</span>
      <span className="font-mono text-[10px] text-muted-foreground uppercase">
        {color.replace("#", "")}
      </span>
    </span>
  )
}
