import { accounts, db, users } from "@workspace/db"
import { desc } from "drizzle-orm"

import { requireCapability } from "@/app/_lib/auth/guard"
import { UsersList, type UserRow } from "./_components/users-list"

/** OAuth provider id → display label for the login-method line. */
const PROVIDER_LABELS: Record<string, string> = { google: "Google" }

/**
 * /backflip/users — admin user list (owner + admin can view; owner can edit).
 * Reads all users newest-first. `passwordHash` is read only to derive a
 * boolean login method server-side — the hash itself never reaches the client.
 */
export default async function UsersPage() {
  const sessionUser = await requireCapability("users.view")

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      createdAt: users.createdAt,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .orderBy(desc(users.createdAt))

  // Linked OAuth providers, grouped by user.
  const accountRows = await db
    .select({ userId: accounts.userId, provider: accounts.provider })
    .from(accounts)
  const providersByUser = new Map<string, string[]>()
  for (const a of accountRows) {
    const list = providersByUser.get(a.userId) ?? []
    list.push(a.provider)
    providersByUser.set(a.userId, list)
  }

  const list: UserRow[] = rows.map((u) => {
    const loginMethods: string[] = []
    if (u.passwordHash) loginMethods.push("Password")
    for (const p of providersByUser.get(u.id) ?? []) {
      loginMethods.push(PROVIDER_LABELS[p] ?? p)
    }
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role,
      loginMethods,
    }
  })

  return (
    <UsersList
      users={list}
      sessionRole={sessionUser.role}
      sessionUserId={sessionUser.id}
    />
  )
}
