"use client"

import { RiCheckboxCircleFill } from "@remixicon/react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Verified marker — a green tick that replaces the old "Verified" pill, so a
 * confirmed address reads as a quiet checkmark rather than a badge competing
 * with the address next to it.
 *
 * The word survives in two places, not one: a tooltip for pointer users and
 * `sr-only` text for the accessible name. A tooltip alone would be hover-only,
 * reaching neither touch nor a screen reader — and "verified" is the whole
 * meaning of the mark, so it cannot live in a hover affordance exclusively.
 * The trigger stays a real button precisely so keyboard focus can summon it.
 *
 * Only the positive state gets a tick: "Unverified" keeps its text label,
 * since an absent mark is not a legible way to say something is pending.
 */
export function VerifiedTick({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "inline-flex flex-none cursor-default items-center rounded-sm text-emerald-600 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-emerald-400",
          className
        )}
      >
        <RiCheckboxCircleFill aria-hidden className="size-4" />
        <span className="sr-only">Verified</span>
      </TooltipTrigger>
      <TooltipContent>Verified</TooltipContent>
    </Tooltip>
  )
}
