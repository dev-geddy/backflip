import { db, users } from "@workspace/db"
import { desc } from "drizzle-orm"

import { UsersTable, type UserRow } from "./_components/users-table"

/**
 * /backflip/users — admin user list. Reads all users, newest first.
 * Passwords/hashes never leave the server; only display fields are selected.
 */
export default async function UsersPage() {
  const rows: UserRow[] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))

  return <UsersTable users={rows} />
}
