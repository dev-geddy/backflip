import "server-only"

import { db, telemetryStart } from "@workspace/db"
import { lt } from "drizzle-orm"

import { PRUNE_MIN_INTERVAL_MS, retentionCutoff } from "./config"

/**
 * Retention for `telemetry_start`. Event rows older than the cutoff are
 * deleted; the `telemetry_install` aggregate is never touched, so pruning
 * forgets *when* an install ran, never *that* it exists.
 *
 * The sweep piggybacks on ingest instead of running on a schedule — see
 * `PRUNE_MIN_INTERVAL_MS` for why. It is fire-and-forget: the caller does not
 * await it and a failure is invisible, because a failed cleanup must never
 * cost a start report.
 *
 * @spec L2-TELEMETRY-31, L2-TELEMETRY-32
 */

/** Last sweep in this process. Module scope, same caveat as the limiters. */
let lastPruneAt = 0

/**
 * Run a sweep if one has not run recently in this process. Returns the number
 * of rows deleted, or null when the sweep was skipped.
 *
 * A restart forgets the timestamp and the next report sweeps again. Harmless:
 * the delete is indexed on `createdAt` and, on all but the first sweep after a
 * long gap, matches nothing.
 */
export async function maybePruneOldStarts(
  now: Date = new Date()
): Promise<number | null> {
  if (now.getTime() - lastPruneAt < PRUNE_MIN_INTERVAL_MS) return null
  lastPruneAt = now.getTime()

  const deleted = await db
    .delete(telemetryStart)
    .where(lt(telemetryStart.createdAt, retentionCutoff(now)))
    .returning({ id: telemetryStart.id })

  return deleted.length
}
