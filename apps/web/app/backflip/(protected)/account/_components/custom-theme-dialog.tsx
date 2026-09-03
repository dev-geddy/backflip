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
  BUILT_IN_CHROME_PRESETS,
  MAX_PRESET_NAME,
  MAX_SAVED_PRESETS,
  samePair,
} from "@/app/_lib/theme/chrome-presets"
import {
  customChromeVars,
  type ChromeTheme,
} from "@/app/_lib/theme/chrome-themes"
import type { SavedChromePreset } from "@/app/_lib/theme/preferences"

import { createChromePreset, deleteChromePreset } from "../_actions"
import { ShellPreview } from "./shell-preview"

type Pair = { surface: string; accent: string }

/**
 * The custom-palette editor, in a dialog. Holds everything about rolling your
 * own chrome: the live preview, the two colour inputs, the pairs Backflip
 * ships, and the pairs you saved.
 *
 * It lives in a dialog rather than on the page because the picker is a
 * *browsing* task — comparing a dozen swatches against a preview — while the
 * page around it is a list of settings. Inline, the preset shelf would double
 * the height of the Appearance section for something most people open once.
 *
 * Every change applies to the live shell immediately and persists in the
 * background, exactly like the theme tiles behind it (`L2-UI-25`): the dialog
 * has no Save button for the colours themselves, only for naming a pair you
 * want to keep.
 *
 * @spec L2-UI-55
 */
export function CustomThemeDialog({
  colors,
  saved,
  headerThemed,
  glass,
  onPick,
  onApplyPair,
}: {
  colors: Pair
  saved: SavedChromePreset[]
  headerThemed: boolean
  glass: boolean
  onPick: (part: "surface" | "accent", value: string) => void
  onApplyPair: (pair: Pair) => void
}) {
  const [open, setOpen] = useState(false)
  const [presets, setPresets] = useState(saved)
  const [name, setName] = useState("")
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
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        Customize…
      </Button>

      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Custom colours</DialogTitle>
          <DialogDescription>
            Pick a surface and an active-row colour, or start from a preset.
            Text and borders are derived from your picks, so they stay readable.
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
            <div className="flex w-full flex-none flex-col gap-2 sm:w-[168px]">
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
            </div>
          </div>

          <Section title="Presets">
            <SwatchGrid>
              {BUILT_IN_CHROME_PRESETS.map((preset) => (
                <Swatch
                  key={preset.id}
                  name={preset.name}
                  pair={preset}
                  active={samePair(colors, preset)}
                  onSelect={() => onApplyPair(preset)}
                />
              ))}
            </SwatchGrid>
          </Section>

          <Section
            title="Saved"
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

            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    save()
                  }
                }}
                maxLength={MAX_PRESET_NAME}
                placeholder="Name these colours"
                aria-label="Preset name"
                className="h-9"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 flex-none"
                // A full shelf still allows a save — it may be an update to a
                // name already held. The action decides; this only stops the
                // obviously-new case from looking available.
                disabled={
                  pending ||
                  !name.trim() ||
                  (full && !presets.some((p) => p.name === name.trim()))
                }
                onClick={save}
              >
                <RiAddLine className="size-4" />
                Save
              </Button>
            </div>
          </Section>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
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
          // Hidden until hover/focus so the shelf reads as swatches, not as a
          // management table; keyboard users get it via focus-visible.
          className="absolute top-1 right-1 hidden size-5 items-center justify-center rounded-md bg-background/90 text-muted-foreground group-hover:flex hover:text-foreground focus-visible:flex"
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
    <ShellPreview theme={theme} headerThemed={headerThemed} glass={glass} />
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
