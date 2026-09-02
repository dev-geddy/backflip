import "server-only"

import { db, telemetryInstall, telemetryStart } from "@workspace/db"
import { and, count, eq, gte } from "drizzle-orm"

import {
  MAX_STARTS_PER_INSTALL_PER_DAY,
  MIN_START_INTERVAL_MS,
  telemetryHash,
  utcDay,
} from "./config"
import type { StartReport } from "./payload"

/**
 * Ingest side of telemetry: turn one validated start report into (at most) one
 * `telemetry_start` row plus an updated `telemetry_install` aggregate.
 *
 * Every identifier is hashed before it is written (`telemetryHash`), so this
 * module is the last place a raw install id or IP exists.
 *
 * The outcome is reported back to the route so it can spend the right rate
 * budget: only a request that actually created an install row costs
 * new-install budget, which is what makes that budget worth having.
 *
 * @spec L2-TELEMETRY-07
 */

export type RecordOutcome =
  /** No `TELEMETRY_HASH_SALT` — this deployment does not collect telemetry. */
  | "disabled"
  /** First report from this install; a row was created. */
  | "created"
  /** Known install, counted. */
  | "bumped"
  /** Known install, inside the minimum interval or over its daily cap. */
  | "throttled"
  /** Known install marked `ignored` — accepted and dropped on the floor. */
  | "ignored"
  /** Would have created a row, but the caller had no new-install budget. */
  | "budget"

export async function recordStart(opts: {
  report: StartReport
  ip: string
  allowNewInstall: boolean
  now?: Date
}): Promise<RecordOutcome> {
  const now = opts.now ?? new Date()
  const today = utcDay(now)
  const { report } = opts

  const installIdHash = telemetryHash("install", report.installId)
  if (!installIdHash) return "disabled"
  const ipHash = telemetryHash("ip", opts.ip)

  const [existing] = await db
    .select()
    .from(telemetryInstall)
    .where(eq(telemetryInstall.installIdHash, installIdHash))

  if (!existing) {
    if (!opts.allowNewInstall) return "budget"

    // `onConflictDoNothing` rather than a plain insert: two dev servers
    // starting at once would otherwise race to the unique index. Losing the
    // race is not an error — it just means this report is a bump.
    const created = await db
      .insert(telemetryInstall)
      .values({
        installIdHash,
        firstSeenAt: now,
        lastSeenAt: now,
        startCount: 1,
        activeDays: 1,
        lastActiveDay: today,
        appVersion: report.appVersion,
        platform: report.platform,
        nodeMajor: report.nodeMajor,
      })
      .onConflictDoNothing({ target: telemetryInstall.installIdHash })
      .returning({ id: telemetryInstall.id })

    if (created.length > 0) {
      await db.insert(telemetryStart).values({
        installIdHash,
        ipHash,
        appVersion: report.appVersion,
        platform: report.platform,
        createdAt: now,
      })
      return "created"
    }
    // Lost the race — fall through and treat it as a bump below.
    return bump({ installIdHash, ipHash, report, now, today })
  }

  if (existing.ignored) return "ignored"

  if (now.getTime() - existing.lastSeenAt.getTime() < MIN_START_INTERVAL_MS) {
    return "throttled"
  }

  if (existing.lastActiveDay === today) {
    const startOfDay = new Date(`${today}T00:00:00.000Z`)
    const [{ value } = { value: 0 }] = await db
      .select({ value: count() })
      .from(telemetryStart)
      .where(
        and(
          eq(telemetryStart.installIdHash, installIdHash),
          gte(telemetryStart.createdAt, startOfDay)
        )
      )
    if (value >= MAX_STARTS_PER_INSTALL_PER_DAY) return "throttled"
  }

  return bump({ installIdHash, ipHash, report, now, today })
}

/**
 * Count one start against a known install. The event row and the aggregate move
 * together — a `telemetry_start` row the aggregate never saw would make the
 * daily-cap check wrong on the next request.
 */
async function bump(args: {
  installIdHash: string
  ipHash: string | null
  report: StartReport
  now: Date
  today: string
}): Promise<RecordOutcome> {
  const { installIdHash, ipHash, report, now, today } = args

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        activeDays: telemetryInstall.activeDays,
        lastActiveDay: telemetryInstall.lastActiveDay,
        startCount: telemetryInstall.startCount,
      })
      .from(telemetryInstall)
      .where(eq(telemetryInstall.installIdHash, installIdHash))
    if (!row) return

    await tx.insert(telemetryStart).values({
      installIdHash,
      ipHash,
      appVersion: report.appVersion,
      platform: report.platform,
      createdAt: now,
    })

    await tx
      .update(telemetryInstall)
      .set({
        lastSeenAt: now,
        startCount: row.startCount + 1,
        activeDays:
          row.lastActiveDay === today ? row.activeDays : row.activeDays + 1,
        lastActiveDay: today,
        appVersion: report.appVersion,
        platform: report.platform,
        nodeMajor: report.nodeMajor,
      })
      .where(eq(telemetryInstall.installIdHash, installIdHash))
  })

  return "bumped"
}
