import "../load-env"

import bcrypt from "bcryptjs"

import { db } from "../client"
import { users } from "../schema"

/**
 * Seeds (or updates) the platform owner from `.env.local`:
 *   ADMIN_EMAIL, ADMIN_PASSWORD
 * Run: `corepack yarn init-owner`.
 */
async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set (define them in .env.local)."
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db
    .insert(users)
    .values({ email, passwordHash, role: "owner", name: "Dev Geddy" })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash, role: "owner", name: "Dev Geddy" },
    })

  console.log(`✓ Owner seeded: ${email}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
