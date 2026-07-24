import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

/**
 * Platform roles. `owner` = top-level admin (seeded); can do everything.
 * `admin` = operator, cannot edit system settings. `teammate` = own account
 * area + admin dashboard only. Capability model lives in the auth domain.
 */
export const userRole = pgEnum("user_role", ["owner", "admin", "teammate"])

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
  role: userRole("role").notNull().default("teammate"),
  // Bumped on password/email change to invalidate all existing JWT sessions.
  tokenVersion: integer("tokenVersion").notNull().default(0),
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

/**
 * Short-lived, single-use tokens for self-service account flows:
 * - `password_reset` — forgot-password: proves control of the email.
 * - `email_change` — confirms a new email before it replaces the old one
 *   (`newEmail` holds the pending address).
 * Only the SHA-256 hash of the token is stored (`tokenHash`); the raw token
 * lives only in the emailed link. Rows are consumed (`consumedAt`) on use and
 * expire (`expiresAt`).
 */
export const userTokenType = pgEnum("user_token_type", [
  "password_reset",
  "email_change",
])

export const userTokens = pgTable("user_token", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: userTokenType("type").notNull(),
  tokenHash: text("tokenHash").notNull().unique(),
  newEmail: text("newEmail"),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  consumedAt: timestamp("consumedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

/** AI providers supported by the integration config. */
export const aiProvider = pgEnum("ai_provider", ["anthropic", "openai", "google"])

/**
 * AI integration config — one row per provider. Consumed by the (future)
 * AI SDK layer. `apiKeyEnc` is AES-256-GCM encrypted (see `crypto.ts`); the
 * plaintext key never leaves the server.
 */
export const aiConfig = pgTable("ai_config", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  provider: aiProvider("provider").notNull().unique(),
  model: text("model"),
  apiKeyEnc: text("apiKeyEnc"),
  baseUrl: text("baseUrl"),
  temperature: real("temperature").notNull().default(0.7),
  enabled: boolean("enabled").notNull().default(false),
  isDefault: boolean("isDefault").notNull().default(false),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
})

/**
 * Email sending config — single row (provider `resend`). `apiKeyEnc` is
 * AES-256-GCM encrypted (see `crypto.ts`); plaintext never leaves the server.
 */
export const emailConfig = pgTable("email_config", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  provider: text("provider").notNull().unique().default("resend"),
  apiKeyEnc: text("apiKeyEnc"),
  fromEmail: text("fromEmail"),
  fromName: text("fromName"),
  replyTo: text("replyTo"),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
})
