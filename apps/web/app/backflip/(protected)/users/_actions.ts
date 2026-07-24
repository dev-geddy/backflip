"use server"

import { revalidatePath } from "next/cache"

import { db, users } from "@workspace/db"
import { eq } from "drizzle-orm"

import { auth } from "@/app/_lib/auth"
import { canEditUsers, isRole, type Role } from "@/app/_lib/auth/permissions"

export type SaveState = { ok: boolean; message: string } | null

function isUniqueViolation(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "23505"
  )
}

/**
 * Owner-only: update a user's name, email, and role. Guards:
 * - capability `users.edit` (owner) — server-enforced, not just UI-hidden.
 * - self-lockout: an owner cannot change their own role.
 * - unique email: friendly message on the pg 23505 violation.
 */
export async function updateUser(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canEditUsers(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const id = String(formData.get("id") ?? "")
  if (!id) return { ok: false, message: "Missing user id" }

  const name = String(formData.get("name") ?? "").trim() || null
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const role = String(formData.get("role") ?? "")

  if (!email) return { ok: false, message: "Email is required" }
  if (!isRole(role)) return { ok: false, message: "Unknown role" }

  if (id === session.user.id && role !== session.user.role) {
    return { ok: false, message: "You can't change your own role." }
  }

  const set: { name: string | null; email: string; role: Role } = {
    name,
    email,
    role,
  }

  try {
    await db.update(users).set(set).where(eq(users.id, id))
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, message: "Email already in use." }
    }
    throw e
  }

  revalidatePath("/backflip/users")
  return { ok: true, message: "Saved." }
}
