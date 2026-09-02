import "server-only"

import { db, telemetryInstall, telemetryStart } from "@workspace/db"
import { and, count, countDistinct, eq, gte, lt, sql } from "drizzle-orm"

import { WINDOW_DAYS, utcDay } from "./config"

/**
 * Read side of telemetry: everything the admin Overview's two cards render.
 *
 * Both figures come from `telemetry_start` rows, never from the
 * `telemetry_install` aggregate — the aggregate exists to enforce ingest
 * budgets, and a counter should not be displayed from the same number that
 * throttling logic mutates. Rows belonging to an `ignored` install are excluded
 * everywhere, which is how the maintainer's own machines and any pruned abuse
 * leave the charts.
 *
 * Days are UTC calendar days, matching the ingest-side day rules.
 *
 * @spec L2-TELEMETRY-08
 */

export type TelemetryPoint = { day: string; unique: number; total: number }

export type TelemetrySummary = {
  /** One point per day in the window, zero-filled, oldest first. */
  series: TelemetryPoint[]
  /** Distinct installs that reported in the window. */
  uniqueInstalls: number
  /** Counted starts in the window. */
  totalStarts: number
  /** Same two figures for the preceding window, for the deltas. */
  previousUniqueInstalls: number
  previousTotalStarts: number
  /**
   * Installs in the window that have reported on at least two distinct days.
   * A forged install costs one request; a forged *returning* install costs a
   * sustained campaign, so this is the figure to trust when the other one
   * looks surprising.
   */
  returningInstalls: number
  /** Whether this deployment has ever ingested anything. */
  hasData: boolean
}

/** Midnight UTC, `days` before `now`. */
function windowStart(now: Date, days: number): Date {
  const start = new Date(`${utcDay(now)}T00:00:00.000Z`)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return start
}

const notIgnored = eq(telemetryInstall.ignored, false)

async function windowStats(from: Date, to?: Date) {
  const bounds = to
    ? and(gte(telemetryStart.createdAt, from), lt(telemetryStart.createdAt, to))
    : gte(telemetryStart.createdAt, from)

  const [row] = await db
    .select({
      total: count(),
      unique: countDistinct(telemetryStart.installIdHash),
    })
    .from(telemetryStart)
    .innerJoin(
      telemetryInstall,
      eq(telemetryInstall.installIdHash, telemetryStart.installIdHash)
    )
    .where(and(bounds, notIgnored))

  return { total: row?.total ?? 0, unique: row?.unique ?? 0 }
}

export async function getTelemetrySummary(
  now: Date = new Date()
): Promise<TelemetrySummary> {
  const from = windowStart(now, WINDOW_DAYS)
  const previousFrom = windowStart(from, WINDOW_DAYS + 1)

  const day = sql<string>`to_char(date_trunc('day', ${telemetryStart.createdAt}), 'YYYY-MM-DD')`

  const [rows, current, previous, returning, [everRow]] = await Promise.all([
    db
      .select({
        day,
        total: count(),
        unique: countDistinct(telemetryStart.installIdHash),
      })
      .from(telemetryStart)
      .innerJoin(
        telemetryInstall,
        eq(telemetryInstall.installIdHash, telemetryStart.installIdHash)
      )
      .where(and(gte(telemetryStart.createdAt, from), notIgnored))
      .groupBy(day)
      .orderBy(day),
    windowStats(from),
    windowStats(previousFrom, from),
    db
      .select({ value: countDistinct(telemetryStart.installIdHash) })
      .from(telemetryStart)
      .innerJoin(
        telemetryInstall,
        eq(telemetryInstall.installIdHash, telemetryStart.installIdHash)
      )
      .where(
        and(
          gte(telemetryStart.createdAt, from),
          notIgnored,
          gte(telemetryInstall.activeDays, 2)
        )
      ),
    db.select({ value: count() }).from(telemetryInstall),
  ])

  // Zero-fill: a gap in the data is information (nobody started the app that
  // day), and a chart that silently closes gaps would draw a line through it.
  const byDay = new Map(rows.map((r) => [r.day, r]))
  const series: TelemetryPoint[] = []
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const at = new Date(from)
    at.setUTCDate(at.getUTCDate() + i)
    const key = utcDay(at)
    const row = byDay.get(key)
    series.push({
      day: key,
      unique: row?.unique ?? 0,
      total: row?.total ?? 0,
    })
  }

  return {
    series,
    uniqueInstalls: current.unique,
    totalStarts: current.total,
    previousUniqueInstalls: previous.unique,
    previousTotalStarts: previous.total,
    returningInstalls: returning[0]?.value ?? 0,
    hasData: (everRow?.value ?? 0) > 0,
  }
}
