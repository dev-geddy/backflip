"use server"

import { revalidatePath } from "next/cache"

import { db, telemetryInstall } from "@workspace/db"
import { eq } from "drizzle-orm"

import { auth } from "@/app/_lib/auth"
import { canAccessSettings } from "@/app/_lib/auth/permissions"

/**
 * Admin Overview actions.
 *
 * @spec L2-TELEMETRY-34
 */

export type IgnoreState = { ok: boolean; message: string } | null

/**
 * Mark one install ignored (or not). An ignored install disappears from every
 * telemetry figure retroactively — it is the escape hatch that makes an
 * unauthenticated counter tolerable: the maintainer's own machines and any
 * inflated data can be disowned after the fact, without deleting evidence.
 *
 * Reversible on purpose. Ignoring is a judgement about data, and judgements
 * about data should be revisable, so nothing is destroyed and the row keeps
 * showing up in the manager either way.
 *
 * Gated on `settings` — the same capability that reveals the figures at all.
 */
export async function setTelemetryInstallIgnored(
  id: string,
  ignored: boolean
): Promise<IgnoreState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  if (!id) return { ok: false, message: "Missing install" }

  const [updated] = await db
    .update(telemetryInstall)
    .set({ ignored })
    .where(eq(telemetryInstall.id, id))
    .returning({ id: telemetryInstall.id })

  if (!updated) return { ok: false, message: "Unknown install" }

  revalidatePath("/backflip")
  return {
    ok: true,
    message: ignored ? "Install excluded" : "Install counted again",
  }
}
