import "./load-env"

import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"

/**
 * Applies committed SQL migrations from ./migrations using drizzle-orm's
 * programmatic migrator. Used instead of `drizzle-kit migrate`, which
 * silently no-ops in this setup.
 */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool)
  await migrate(db, { migrationsFolder: "./migrations" })
  await pool.end()
  console.log("✓ migrations applied")
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
