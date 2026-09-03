"use client"

import { useEffect, useRef, useState, useTransition } from "react"

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

import { RiCheckLine, RiDeleteBinLine } from "@remixicon/react"

import {
  MAX_PRESET_NAME,
  MAX_SAVED_PRESETS,
  normalizePresetName,
  planPresetSave,
  samePair,
  type PresetSavePlan,
} from "@/app/_lib/theme/chrome-presets"
import {
  customChromeVars,
  type ChromeTheme,
  type ChromeThemeId,
} from "@/app/_lib/theme/chrome-themes"
import type { SavedChromePreset } from "@/app/_lib/theme/preferences"

import {
  createChromePreset,
  deleteChromePreset,
  updateChromePreset,
} from "../_actions"
import { ShellPreview } from "./shell-preview"

type Pair = { surface: string; accent: string }

/**
 * How close to the cap the shelf has to get before its count is worth saying.
 * "4 of 24" was read as "there are 24 presets" — a count of things, not of
 * headroom — and headroom is only ever actionable once it is nearly gone.
 */
const CAP_HINT_FROM = 4

/** How long a just-saved chip stays ringed, in ms. Long enough to look at, short enough not to linger. */
const FLASH_MS = 1600

const ACTION_LABELS = {
  create: "Save preset",
  replace: "Replace preset",
  update: "Update preset",
} as const

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
 * the one control under the wells that names the pair.
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
  const [pending, start] = useTransition()

  // The preset the colours were last taken from. It only matters once they no
  // longer match it exactly — that is precisely the "I nudged Brick" case the
  // panel turns into an update instead of a silent fork.
  const [basisId, setBasisId] = useState<string | null>(null)
  // Set by "Save as a copy": the one way to say "stop editing that preset".
  const [detached, setDetached] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const flashRef = useRef<HTMLDivElement>(null)

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

  // What the pair on screen *is*. A user preset wins over a shipped one with
  // the same colours: only one of the two can be edited.
  const exact = presets.find((preset) => samePair(colors, preset)) ?? null
  const shipped = exact
    ? null
    : (system.find((preset) => samePair(colors, preset)) ?? null)
  const basis = basisId
    ? (presets.find((preset) => preset.id === basisId) ?? null)
    : null
  const origin = detached || shipped ? null : (exact ?? basis)

  // The name field follows whatever the panel is editing, so it always states
  // the preset you are looking at. Keyed on identity, not on the name itself,
  // so typing a new name into it is never undone.
  const originKey = origin?.id ?? (shipped ? `system:${shipped.id}` : "")
  const [lastOriginKey, setLastOriginKey] = useState(originKey)
  if (originKey !== lastOriginKey) {
    setLastOriginKey(originKey)
    setName(origin?.name ?? "")
  }

  const plan = planPresetSave({ name, colors, origin, presets })
  const clean = normalizePresetName(name)
  const remaining = MAX_SAVED_PRESETS - presets.length

  useEffect(() => {
    if (!flash) return
    // The shelf can sit below the dialog's fold, so a save has to *show* the
    // chip it produced rather than only claim it in a toast.
    flashRef.current?.scrollIntoView({ block: "nearest" })
    const timer = setTimeout(() => setFlash(null), FLASH_MS)
    return () => clearTimeout(timer)
  }, [flash])

  /** Adopt a pair from the shelf. Only a user preset becomes editable. */
  function choose(preset: SavedChromePreset, own: boolean) {
    setBasisId(own ? preset.id : null)
    setDetached(false)
    onApplyPair(preset)
  }

  /** Nudge one colour. Keeps the matched preset as the thing being edited. */
  function pick(part: "surface" | "accent", value: string) {
    if (exact) setBasisId(exact.id)
    onPick(part, value)
  }

  function run() {
    if (!clean || plan.blocked) return

    start(async () => {
      const res =
        plan.action === "update" && origin
          ? await updateChromePreset(
              origin.id,
              clean,
              colors.surface,
              colors.accent
            )
          : await createChromePreset(clean, colors.surface, colors.accent)
      if (!res?.ok) {
        toast.error(res?.message ?? "Couldn't save that preset.")
        return
      }

      // Replace the touched row *in place* — an update keeps its `createdAt`,
      // so moving it to the head here would only be undone by the next
      // revalidation, and the chip would appear to hop.
      setPresets((current) => {
        const at = current.findIndex((p) =>
          plan.action === "update" && origin
            ? p.id === origin.id
            : p.name === clean
        )
        const row = { name: clean, ...colors }
        if (at === -1) {
          return [{ id: `pending:${clean}`, ...row }, ...current]
        }
        return current.map((p, i) => (i === at ? { ...p, ...row } : p))
      })
      setDetached(false)
      setFlash(clean)
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
            <div className="flex w-full flex-none flex-col gap-2 sm:w-[228px]">
              <ColorInput
                id="custom-surface"
                label="Sidebar"
                value={colors.surface}
                onChange={(v) => pick("surface", v)}
              />
              <ColorInput
                id="custom-accent"
                label="Active row"
                value={colors.accent}
                onChange={(v) => pick("accent", v)}
              />

              <SavePanel
                name={name}
                onNameChange={setName}
                plan={plan}
                origin={origin}
                shipped={shipped}
                pending={pending}
                onRun={run}
                onDetach={() => setDetached(true)}
              />
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
                  onSelect={() => choose(preset, false)}
                />
              ))}
            </SwatchGrid>
          </Section>

          <Section
            title="User presets"
            // Silent until the cap is within reach: a count that is not yet
            // actionable only invites reading it as an inventory.
            hint={
              remaining <= 0
                ? "No room left"
                : remaining <= CAP_HINT_FROM
                  ? `Room for ${remaining} more`
                  : undefined
            }
          >
            {presets.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Nothing saved yet. Name a pair of colours above and it lands
                here.
              </p>
            ) : (
              <SwatchGrid>
                {presets.map((preset) => (
                  <Swatch
                    key={preset.id}
                    ref={flash === preset.name ? flashRef : undefined}
                    name={preset.name}
                    pair={preset}
                    active={samePair(colors, preset)}
                    editing={
                      origin?.id === preset.id && !samePair(colors, preset)
                    }
                    flashing={flash === preset.name}
                    onSelect={() => choose(preset, true)}
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

/**
 * The one control that turns the colours on screen into a preset — always
 * present, always the same shape: a name, a button, and a line of consequence
 * under it. Earlier this slot appeared and vanished with the match state,
 * which made the column jump and left the "save" affordance feeling
 * conditional on something the user could not name.
 *
 * What it does changes; where it is does not. Whether the button creates,
 * replaces or updates is decided by `planPresetSave` and **stated on the
 * button before the click** — the previous flow overwrote a preset of the same
 * name with no warning at all.
 */
function SavePanel({
  name,
  onNameChange,
  plan,
  origin,
  shipped,
  pending,
  onRun,
  onDetach,
}: {
  name: string
  onNameChange: (name: string) => void
  plan: PresetSavePlan
  origin: SavedChromePreset | null
  shipped: SavedChromePreset | null
  pending: boolean
  onRun: () => void
  onDetach: () => void
}) {
  const settled = plan.blocked === "unchanged"
  const invalid = plan.blocked === "clash"

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          onRun()
        }}
        maxLength={MAX_PRESET_NAME}
        placeholder={origin ? origin.name : "Name these colours"}
        aria-label="Preset name"
        aria-invalid={invalid}
        className="h-9"
      />

      <Button
        type="button"
        size="sm"
        variant={settled ? "outline" : "default"}
        className="h-8 w-full"
        disabled={pending || plan.blocked !== null}
        onClick={onRun}
      >
        {settled ? (
          <>
            <RiCheckLine className="size-4" />
            Saved
          </>
        ) : (
          ACTION_LABELS[plan.action]
        )}
      </Button>

      {/* Fixed height, so no state of this panel is taller than another. */}
      <p
        className={cn(
          "min-h-8 text-[11px] leading-tight",
          invalid ? "text-destructive" : "text-muted-foreground"
        )}
      >
        <SaveHint
          plan={plan}
          origin={origin}
          shipped={shipped}
          onDetach={onDetach}
        />
      </p>
    </div>
  )
}

/** The consequence of pressing the button, in words, before it is pressed. */
function SaveHint({
  plan,
  origin,
  shipped,
  onDetach,
}: {
  plan: PresetSavePlan
  origin: SavedChromePreset | null
  shipped: SavedChromePreset | null
  onDetach: () => void
}) {
  if (plan.blocked === "clash") {
    return <>You already have a preset called “{plan.target}”.</>
  }
  if (plan.blocked === "unchanged") {
    return <>These are “{plan.target}”. Edit the name here to rename it.</>
  }
  if (plan.blocked === "full") {
    return (
      <>
        You&rsquo;re keeping all {MAX_SAVED_PRESETS}. Delete one below to make
        room.
      </>
    )
  }
  if (plan.blocked === "empty") {
    if (origin) return <>A preset needs a name.</>
    if (shipped) {
      return <>These are “{shipped.name}”. Name them to keep a copy.</>
    }
    return <>Name these colours to keep them under User presets below.</>
  }
  if (plan.action === "replace") {
    return <>Overwrites the colours of “{plan.target}”.</>
  }
  if (plan.action === "update") {
    return (
      <>
        Changes “{plan.target}” in place.{" "}
        <button
          type="button"
          onClick={onDetach}
          className="underline underline-offset-2 hover:text-foreground"
        >
          Save as a copy
        </button>{" "}
        instead.
      </>
    )
  }
  return <>Adds a new preset under User presets below.</>
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
  ref,
  name,
  pair,
  active,
  editing,
  flashing,
  onSelect,
  onRemove,
}: {
  ref?: React.Ref<HTMLDivElement>
  name: string
  pair: Pair
  active: boolean
  /** The colours on screen came from this preset but have since moved on. */
  editing?: boolean
  /** Just written — rings briefly, so a save points at the chip it produced. */
  flashing?: boolean
  onSelect: () => void
  onRemove?: () => void
}) {
  return (
    <div ref={ref} className="group relative">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          "flex w-full flex-col gap-1.5 rounded-lg border p-1.5 text-left transition-colors",
          active
            ? "border-primary"
            : editing
              ? "border-dashed border-primary/50"
              : "border-border hover:border-muted-foreground/40",
          flashing && "ring-2 ring-primary ring-offset-2 ring-offset-popover"
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
