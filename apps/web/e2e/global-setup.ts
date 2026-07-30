import path from "node:path"
import { fileURLToPath } from "node:url"

import bcrypt from "bcryptjs"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import pg from "pg"

import { users } from "@workspace/db/schema"
import {
  ADMIN_DATABASE_URL,
  OWNER,
  TEAMMATE,
  TEST_DATABASE_URL,
  TEST_DB_NAME,
} from "./env"

// @spec L2-TEST-03, L2-TEST-04

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../packages/db/migrations"
)

/** Create the test database when it doesn't exist yet. It is never dropped:
 *  a reused dev server (`reuseExistingServer`) holds a live connection pool. */
async function ensureDatabase() {
  const admin = new pg.Client({ connectionString: ADMIN_DATABASE_URL })
  await admin.connect()
  try {
    const { rowCount } = await admin.query(
      "select 1 from pg_database where datname = $1",
      [TEST_DB_NAME]
    )
    if (!rowCount) await admin.query(`create database "${TEST_DB_NAME}"`)
  } finally {
    await admin.end()
  }
}

/** Migrate, then reset auth state and reseed the two fixture users. Config
 *  tables are left as the migrations seeded them. */
async function migrateAndSeed() {
  const pool = new pg.Pool({ connectionString: TEST_DATABASE_URL })
  const db = drizzle(pool)
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR })

    await db.execute(
      sql`truncate table "user", "account", "session", "verificationToken" cascade`
    )

    for (const account of [OWNER, TEAMMATE]) {
      await db.insert(users).values({
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash: await bcrypt.hash(account.password, 10),
      })
    }
  } finally {
    await pool.end()
  }
}

export default async function globalSetup() {
  await ensureDatabase()
  await migrateAndSeed()
}
