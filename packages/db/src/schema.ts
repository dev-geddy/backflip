import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

/**
 * Platform roles. `owner` = top-level admin (seeded). Others reserved for
 * future access tiers.
 */
export const userRole = pgEnum("user_role", ["owner", "admin", "member"])

/**
 * Users. Auth.js base shape (id/name/email/emailVerified/image) plus:
 * - `passwordHash` — bcrypt hash for credentials login (null = OAuth-only).
 * - `role` — platform role.
 */
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("passwordHash"),
  role: userRole("role").notNull().default("member"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

/** OAuth provider accounts (Auth.js adapter shape). */
export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<"oauth" | "oidc" | "email" | "webauthn">().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
)

/** DB sessions (unused under JWT strategy, kept for adapter completeness). */
export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

/** Verification tokens (magic-link/email flows; kept for adapter completeness). */
export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
)
