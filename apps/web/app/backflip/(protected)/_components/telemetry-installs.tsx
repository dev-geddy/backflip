"use client"

import { useState, useTransition } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"
import { toast } from "sonner"

import { RiArrowDownSLine } from "@remixicon/react"

import type { TelemetryInstallRow } from "@/app/_lib/telemetry/queries"
import { setTelemetryInstallIgnored } from "../_actions"

/**
 * Install manager under the Adoption cards: every known install, newest first,
 * each with a switch that decides whether it counts.
 *
 * Collapsed by default. The figures are the point of the section; this is the
 * maintenance drawer behind them, opened when a number looks wrong — most
 * often because a machine of the maintainer's own reported before its opt-out
 * was in place.
 *
 * @spec L2-TELEMETRY-35
 */

const SEEN_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

export function TelemetryInstalls({
  installs,
}: {
  installs: TelemetryInstallRow[]
}) {
  const [open, setOpen] = useState(false)
  const ignoredCount = installs.filter((i) => i.ignored).length

  if (installs.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border bg-card px-5 py-3 text-left hover:bg-accent/40"
          />
        }
      >
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-medium">Manage installs</span>
          <span className="text-xs text-muted-foreground">
            {installs.length} known
            {ignoredCount > 0 ? ` · ${ignoredCount} excluded` : ""}
          </span>
        </span>
        <RiArrowDownSLine
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 rounded-xl border bg-card">
          <div className="border-b px-5 py-3 text-xs text-muted-foreground">
            Switching an install off removes it from every figure above,
            retroactively. Nothing is deleted, and it can be switched back on.
          </div>
          {/* Capped and scrollable: the query returns up to 50 rows, and a
              drawer that pushes the rest of the Overview off-screen is worse
              than one that scrolls. */}
          <div className="flex max-h-[420px] flex-col overflow-y-auto">
            {installs.map((install, i) => (
              <InstallRow
                key={install.id}
                install={install}
                last={i === installs.length - 1}
              />
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function InstallRow({
  install,
  last,
}: {
  install: TelemetryInstallRow
  last: boolean
}) {
  // Optimistic: the switch answers immediately and reverts if the write fails.
  // A revalidate round-trip on every toggle would make the control feel broken
  // on a slow connection.
  const [counted, setCounted] = useState(!install.ignored)
  const [pending, startTransition] = useTransition()

  function toggle(next: boolean) {
    setCounted(next)
    startTransition(async () => {
      const result = await setTelemetryInstallIgnored(install.id, !next)
      if (!result?.ok) {
        setCounted(!next)
        toast.error(result?.message ?? "Could not update this install")
      }
    })
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-5 py-3",
        !last && "border-b",
        !counted && "opacity-60"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[13px]">{install.shortHash}</span>
          <span className="truncate text-xs text-muted-foreground">
            {[install.platform, install.appVersion && `v${install.appVersion}`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {install.startCount} {install.startCount === 1 ? "start" : "starts"}{" "}
          over {install.activeDays} {install.activeDays === 1 ? "day" : "days"}{" "}
          · last seen {SEEN_FMT.format(install.lastSeenAt)}
        </div>
      </div>
      <Switch
        checked={counted}
        disabled={pending}
        onCheckedChange={toggle}
        aria-label={`Count install ${install.shortHash}`}
      />
    </div>
  )
}
