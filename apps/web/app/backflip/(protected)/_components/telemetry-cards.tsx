"use client"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { cn } from "@workspace/ui/lib/utils"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { RiArrowDownLine, RiArrowUpLine } from "@remixicon/react"

import type { TelemetrySummary } from "@/app/_lib/telemetry/queries"
import { SectionLabel } from "./page-heading"

/**
 * The two telemetry cards on the admin Overview: unique installs and total
 * starts over the last 30 days, each with its own chart.
 *
 * Deliberately two cards rather than one dual-series chart. The numbers differ
 * by an order of magnitude — one developer restarting a dev server all day is
 * one install and many starts — so a shared axis would flatten the smaller
 * series into the baseline. Separate cards let each keep its own scale, and the
 * pairing itself is the insight: uniques say how far the project reaches,
 * starts say how hard the people who have it are working.
 *
 * Client component only because Recharts renders in the browser; every figure
 * is computed server-side and passed in whole.
 *
 * @spec L2-TELEMETRY-12
 */

const TICK_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})
const FULL_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
})

const uniqueConfig = {
  unique: { label: "Installs", color: "var(--chart-1)" },
} satisfies ChartConfig

const totalConfig = {
  total: { label: "Starts", color: "var(--chart-2)" },
} satisfies ChartConfig

/** `YYYY-MM-DD` is parsed as UTC; format it as UTC too, or days slide by one. */
function formatDay(day: string, fmt: Intl.DateTimeFormat) {
  return fmt.format(new Date(`${day}T12:00:00.000Z`))
}

export function TelemetryCards({ summary }: { summary: TelemetrySummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <MetricCard
        label="Unique installs"
        value={summary.uniqueInstalls}
        previous={summary.previousUniqueInstalls}
        unit={summary.uniqueInstalls === 1 ? "install" : "installs"}
        footnote={
          summary.returningInstalls > 0
            ? `${summary.returningInstalls} came back on a later day`
            : "None have come back on a later day yet"
        }
        empty={!summary.hasData}
      >
        <ChartContainer config={uniqueConfig} className="h-[120px] w-full">
          <AreaChart data={summary.series} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="telemetry-unique" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-unique)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-unique)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            {/* Bars sit inside their band, so their end labels clear the card
                on their own; a line starts flush at the axis edge and needs
                the padding, or the first date is clipped. */}
            <XAxis {...DAY_AXIS} padding={{ left: 14, right: 8 }} />
            <ChartTooltip content={<TelemetryTooltip />} />
            <Area
              dataKey="unique"
              type="monotone"
              stroke="var(--color-unique)"
              strokeWidth={2}
              fill="url(#telemetry-unique)"
              // A stat panel should be readable the instant it paints; the
              // grow-in animation only delays the number's context.
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </MetricCard>

      <MetricCard
        label="Total starts"
        value={summary.totalStarts}
        previous={summary.previousTotalStarts}
        unit={summary.totalStarts === 1 ? "start" : "starts"}
        footnote={
          summary.uniqueInstalls > 0
            ? `${perInstall(summary)} per install on average`
            : "No starts recorded in this window"
        }
        empty={!summary.hasData}
      >
        <ChartContainer config={totalConfig} className="h-[120px] w-full">
          <BarChart data={summary.series} margin={CHART_MARGIN}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis {...DAY_AXIS} />
            <ChartTooltip content={<TelemetryTooltip />} />
            <Bar
              dataKey="total"
              fill="var(--color-total)"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      </MetricCard>
    </div>
  )
}

// Enough side room for the first and last day labels to sit under the plot
// instead of being clipped by the card padding.
const CHART_MARGIN = { top: 4, right: 12, bottom: 0, left: 12 }

/** Shared day axis: sparse ticks, no chrome — the numbers lead, not the frame. */
const DAY_AXIS = {
  dataKey: "day",
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  minTickGap: 24,
  interval: 6 as const,
  tickFormatter: (day: string) => formatDay(day, TICK_FMT),
}

function TelemetryTooltip(
  props: React.ComponentProps<typeof ChartTooltipContent>
) {
  return (
    <ChartTooltipContent
      {...props}
      labelFormatter={(label) => formatDay(String(label), FULL_FMT)}
    />
  )
}

function perInstall(summary: TelemetrySummary) {
  const ratio = summary.totalStarts / summary.uniqueInstalls
  return ratio.toFixed(ratio < 10 ? 1 : 0)
}

function MetricCard({
  label,
  value,
  previous,
  unit,
  footnote,
  empty,
  children,
}: {
  label: string
  value: number
  previous: number
  unit: string
  footnote: string
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionLabel>{label}</SectionLabel>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {value.toLocaleString("en-US")}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {unit}
            </span>
          </div>
        </div>
        <Delta current={value} previous={previous} />
      </div>

      <div className="mt-4">
        {empty ? (
          <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
            Nothing reported yet
          </div>
        ) : (
          children
        )}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        {empty ? "Waiting for the first start report" : footnote}
      </div>
    </div>
  )
}

/**
 * Change against the preceding 30 days. Growth from zero has no percentage, so
 * it shows the absolute gain instead of `∞` or a misleading 100%.
 */
function Delta({ current, previous }: { current: number; previous: number }) {
  if (current === previous) {
    return (
      <span className="text-xs text-muted-foreground tabular-nums">
        no change
      </span>
    )
  }

  const up = current > previous
  const text =
    previous === 0
      ? `+${current - previous}`
      : `${up ? "+" : ""}${Math.round(((current - previous) / previous) * 100)}%`

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium tabular-nums",
        up ? "text-emerald-600 dark:text-emerald-500" : "text-muted-foreground"
      )}
      title={`${previous.toLocaleString("en-US")} in the previous 30 days`}
    >
      {up ? (
        <RiArrowUpLine className="size-3.5" />
      ) : (
        <RiArrowDownLine className="size-3.5" />
      )}
      {text}
    </span>
  )
}
