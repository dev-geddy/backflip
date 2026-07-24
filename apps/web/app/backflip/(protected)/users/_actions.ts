"use server"

import { revalidatePath } from "next/cache"

import bcrypt from "bcryptjs"
import { db, users } from "@workspace/db"
import { eq } from "drizzle-orm"

import { auth } from "@/app/_lib/auth"
import { sendWelcomeEmail } from "@/app/_lib/email/send"
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
 * Owner-only: create a new platform user, then send a welcome email
 * (best-effort). Guards:
 * - capability `users.edit` (owner) — server-enforced, not just UI-hidden.
 * - unique email: friendly message on the pg 23505 violation.
 * A password is optional — omit it for users who will sign in via Google
 * (pre-registration is the point; the email row must exist first).
 * Email delivery never blocks creation: an unconfigured Resend or a send
 * failure still returns `ok: true` with an informative message.
 */
export async function createUser(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canEditUsers(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const name = String(formData.get("name") ?? "").trim() || null
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const role = String(formData.get("role") ?? "")
  const password = String(formData.get("password") ?? "")

  if (!email) return { ok: false, message: "Email is required" }
  if (!isRole(role)) return { ok: false, message: "Unknown role" }

  const passwordHash = password ? await bcrypt.hash(password, 12) : null

  try {
    await db.insert(users).values({ name, email, role, passwordHash })
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, message: "Email already in use." }
    }
    throw e
  }

  const result = await sendWelcomeEmail({ to: email, name })

  revalidatePath("/backflip/users")

  if (result.sent) {
    return { ok: true, message: "User added. Welcome email sent." }
  }
  if (result.reason === "not_configured") {
    return {
      ok: true,
      message: "User added. Email sending not configured — no welcome email sent.",
    }
  }
  return {
    ok: true,
    message: `User added, but the welcome email failed to send: ${result.message}`,
  }
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
