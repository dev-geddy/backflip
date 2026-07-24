import { cn } from "@workspace/ui/lib/utils"

import { SectionLabel } from "./page-heading"

type StatCard = {
  label: string
  value: string
  unit?: string
  caption?: string
  /** Small caption prefix styled as a trend, colored by `up`. */
  delta?: string
  up?: boolean
  /** 0–100 — renders a slim progress bar under the value. */
  progress?: number
  /** Renders a small status dot before the caption. */
  dot?: boolean
}

const cards: StatCard[] = [
  {
    label: "Total Revenue",
    value: "$1,250.00",
    delta: "+12.5%",
    up: true,
    caption: "Trending up this month",
  },
  {
    label: "New Customers",
    value: "1,234",
    delta: "-20%",
    up: false,
    caption: "Acquisition needs attention",
  },
  {
    label: "Active Accounts",
    value: "45,678",
    dot: true,
    caption: "Engagement exceeds targets",
  },
  {
    label: "Growth Rate",
    value: "76",
    unit: "%",
    progress: 76,
    caption: "Meets growth projections",
  },
]

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="flex flex-col rounded-xl border bg-card p-5"
        >
          <SectionLabel>{c.label}</SectionLabel>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {c.value}
            </span>
            {c.unit ? (
              <span className="text-sm font-medium text-muted-foreground">
                {c.unit}
              </span>
            ) : null}
            {c.delta ? (
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  c.up ? "text-emerald-600" : "text-red-600"
                )}
              >
                {c.delta}
              </span>
            ) : null}
          </div>

          {c.progress !== undefined ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${c.progress}%` }}
              />
            </div>
          ) : null}

          {c.caption ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              {c.dot ? (
                <span className="size-1.5 rounded-full bg-emerald-500" />
              ) : null}
              {c.caption}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
