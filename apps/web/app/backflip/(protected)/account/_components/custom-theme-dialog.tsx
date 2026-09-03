"use client"

import { useState, useTransition } from "react"

import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { RiAddLine, RiCheckLine, RiDeleteBinLine } from "@remixicon/react"

import {
  MAX_PRESET_NAME,
  MAX_SAVED_PRESETS,
  samePair,
} from "@/app/_lib/theme/chrome-presets"
import {
  customChromeVars,
  type ChromeTheme,
  type ChromeThemeId,
} from "@/app/_lib/theme/chrome-themes"
import type { SavedChromePreset } from "@/app/_lib/theme/preferences"

import { createChromePreset, deleteChromePreset } from "../_actions"
import { ShellPreview } from "./shell-preview"

type Pair = { surface: string; accent: string }

/**
 * The chrome picker, in a dialog: the eight fixed palettes, the colour pairs
 * Backflip ships for the custom theme, the pairs you saved, and the two colour
 * inputs behind them.
 *
 * It lives in a dialog rather than on the page because this is a *browsing*
 * task — comparing twenty-odd swatches against a preview — while the page
 * around it is a list of settings. Inline, the fixed palettes alone pushed the
 * rest of the account below the fold.
 *
 * Fixed palettes stay real themes here, not colour pairs: each keeps its id and
 * its authored stylesheet block (`L2-UI-26`), including gradient stops that
 * cannot be derived from two hex values (`L2-UI-47`). Only the custom theme is
 * expressed as a pair.
 *
 * Every change applies to the live shell immediately and persists in the
 * background (`L2-UI-25`): there is no Save button for the palette itself, only
 * for naming a pair you want to keep.
 *
 * @spec L2-UI-55
 */
export function CustomThemeDialog({
  open,
  onOpenChange,
  selected,
  colors,
  system,
  saved,
  headerThemed,
  glass,
  onPick,
  onApplyPair,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selected: ChromeThemeId
  colors: Pair
  system: SavedChromePreset[]
  saved: SavedChromePreset[]
  headerThemed: boolean
  glass: boolean
  onPick: (part: "surface" | "accent", value: string) => void
  onApplyPair: (pair: Pair) => void
}) {
  const [presets, setPresets] = useState(saved)
  const [name, setName] = useState("")
  const [naming, setNaming] = useState(false)
  const [pending, start] = useTransition()

  // The server revalidates `/backflip/account` after every write, so props are
  // the truth; local state exists only to keep the shelf from flickering
  // between the optimistic update and the refreshed tree. Reconciled during
  // render rather than in an effect — an effect would paint the stale list
  // first and then immediately re-render.
  const [lastSaved, setLastSaved] = useState(saved)
  if (saved !== lastSaved) {
    setLastSaved(saved)
    setPresets(saved)
  }

  const full = presets.length >= MAX_SAVED_PRESETS

  // Saving is only offered for a pair that is not already on a shelf — there
  // is nothing to keep about colours you can already click.
  const match =
    system.find((preset) => samePair(colors, preset)) ??
    presets.find((preset) => samePair(colors, preset))

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return

    start(async () => {
      const res = await createChromePreset(
        trimmed,
        colors.surface,
        colors.accent
      )
      if (!res?.ok) {
        toast.error(res?.message ?? "Couldn't save that preset.")
        return
      }
      // Re-saving an existing name updates it in place, so replace by name
      // rather than appending a second chip with the same label.
      setPresets((current) => [
        { id: `pending:${trimmed}`, name: trimmed, ...colors },
        ...current.filter((p) => p.name !== trimmed),
      ])
      setName("")
      setNaming(false)
      toast.success(res.message)
    })
  }

  function remove(preset: SavedChromePreset) {
    start(async () => {
      const res = await deleteChromePreset(preset.id)
      if (!res?.ok) {
        toast.error(res?.message ?? "Couldn't remove that preset.")
        return
      }
      setPresets((current) => current.filter((p) => p.id !== preset.id))
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          {/* "Sidebar and header theme", not "Chrome themes": chrome is the
              term of art for a window's frame, but to anyone reading a
              settings dialog it names a browser. The title says which two
              surfaces change. */}
          <DialogTitle>Sidebar and header theme</DialogTitle>
          <DialogDescription>
            Colours for this admin&rsquo;s sidebar and header. Pick a preset or
            roll your own two colours — text and borders are always derived, so
            nothing you pick can be unreadable.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <LivePreview
                colors={colors}
                headerThemed={headerThemed}
                glass={glass}
              />
            </div>
            <div className="flex w-full flex-none flex-col gap-2 sm:w-[200px]">
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

              {match ? (
                <p className="text-[11px] leading-tight text-muted-foreground">
                  These are {match.name}.
                </p>
              ) : naming ? (
                <div className="flex flex-col gap-2">
                  <Input
                    autoFocus
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        save()
                      }
                      if (event.key === "Escape") setNaming(false)
                    }}
                    maxLength={MAX_PRESET_NAME}
                    placeholder="Name these colours"
                    aria-label="Preset name"
                    className="h-9"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 flex-1"
                      disabled={pending || !name.trim() || full}
                      onClick={save}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => setNaming(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  {full ? (
                    <p className="text-[11px] leading-tight text-muted-foreground">
                      Shelf is full — delete one below.
                    </p>
                  ) : null}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-full"
                  onClick={() => setNaming(true)}
                >
                  <RiAddLine className="size-4" />
                  Save preset
                </Button>
              )}
            </div>
          </div>

          <Section title="System presets">
            <SwatchGrid>
              {system.map((preset) => (
                <Swatch
                  key={preset.id}
                  name={preset.name}
                  pair={preset}
                  // Only "on" while the custom theme is the applied one —
                  // matching hexes under some other theme is a coincidence,
                  // not a selection.
                  active={selected === "custom" && samePair(colors, preset)}
                  onSelect={() => onApplyPair(preset)}
                />
              ))}
            </SwatchGrid>
          </Section>

          <Section
            title="User presets"
            hint={
              presets.length > 0
                ? `${presets.length} of ${MAX_SAVED_PRESETS}`
                : undefined
            }
          >
            {presets.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Name the colours above to keep them here.
              </p>
            ) : (
              <SwatchGrid>
                {presets.map((preset) => (
                  <Swatch
                    key={preset.id}
                    name={preset.name}
                    pair={preset}
                    active={samePair(colors, preset)}
                    onSelect={() => onApplyPair(preset)}
                    onRemove={() => remove(preset)}
                  />
                ))}
              </SwatchGrid>
            )}
          </Section>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {title}
        </span>
        {hint ? (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function SwatchGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{children}</div>
}

/**
 * One colour pair as a chip: the surface as the tile, the accent as a bar
 * inside it — the same relationship they have in the real chrome, so the chip
 * reads as a miniature rather than as two unrelated squares.
 */
function Swatch({
  name,
  pair,
  active,
  onSelect,
  onRemove,
}: {
  name: string
  pair: Pair
  active: boolean
  onSelect: () => void
  onRemove?: () => void
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          "flex w-full flex-col gap-1.5 rounded-lg border p-1.5 text-left transition-colors",
          active
            ? "border-primary"
            : "border-border hover:border-muted-foreground/40"
        )}
      >
        <span
          className="flex h-9 items-end rounded-md p-1"
          style={{ backgroundColor: pair.surface }}
        >
          <span
            className="h-2.5 w-full rounded-sm"
            style={{ backgroundColor: pair.accent }}
          />
        </span>
        <span className="flex items-center gap-1">
          {active ? <RiCheckLine className="size-3 flex-none" /> : null}
          <span className="min-w-0 flex-1 truncate text-[11px]">{name}</span>
        </span>
      </button>

      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          // Always visible, never hover-gated: a `hidden` control cannot take
          // keyboard focus, and a delete nobody can find is a delete that does
          // not exist.
          className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-md border bg-background/90 text-muted-foreground shadow-sm transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          <RiDeleteBinLine className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

/** The custom palette rendered through the same tile the theme grid uses. */
function LivePreview({
  colors,
  headerThemed,
  glass,
}: {
  colors: Pair
  headerThemed: boolean
  glass: boolean
}) {
  const vars = customChromeVars(colors.surface, colors.accent)
  const theme: ChromeTheme = {
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
    <ShellPreview
      theme={theme}
      headerThemed={headerThemed}
      glass={glass}
      size="tall"
    />
  )
}

/**
 * A colour well plus its hex. The input commits on `change`, not `input` —
 * dragging through the OS colour wheel would otherwise fire a write per frame.
 */
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
        // Keyed on the value so a preset applied elsewhere in the dialog
        // repaints the well — an uncontrolled input would keep the old colour.
        key={value}
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
