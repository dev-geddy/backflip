import "../load-env"

import bcrypt from "bcryptjs"

import { db } from "../client"
import { users } from "../schema"

/**
 * Seeds (or updates) the platform owner from `.env.local`:
 *   ADMIN_EMAIL (required), ADMIN_PASSWORD (optional)
 *
 * `ADMIN_PASSWORD` is optional: omit it to seed a Google-only owner (no
 * `passwordHash`) — the owner then signs in with Google (they're pre-registered
 * by this seed, so `L2-AUTH-10/11` allows it). When omitted on a re-run, any
 * existing password is preserved (not wiped).
 * Run: `corepack yarn init-owner`.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email) {
    throw new Error("ADMIN_EMAIL must be set (define it in .env.local).")
  }

  const passwordHash = password ? await bcrypt.hash(password, 12) : null

  // On update, only overwrite the password when a new one was provided.
  const updateSet: {
    role: "owner"
    name: string
    passwordHash?: string
  } = { role: "owner", name: "Dev Geddy" }
  if (passwordHash) updateSet.passwordHash = passwordHash

  await db
    .insert(users)
    .values({ email, passwordHash, role: "owner", name: "Dev Geddy" })
    .onConflictDoUpdate({ target: users.email, set: updateSet })

  console.log(
    password
      ? `✓ Owner seeded: ${email} (password + Google)`
      : `✓ Owner seeded: ${email} (Google-only — no password set)`
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
