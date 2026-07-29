import { DrizzleAdapter } from "@auth/drizzle-adapter"
import {
  accounts,
  db,
  sessions,
  users,
  verificationTokens,
} from "@workspace/db"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

import { isCredentialsEnabled, isGoogleConfigured } from "./config"
import "./types"

/**
 * Auth.js (v5) config. Two providers:
 * - Credentials — email + password against `user.passwordHash` (bcrypt).
 * - Google — OAuth, but ONLY for emails already registered on the platform
 *   (enforced in the `signIn` callback). Links to the existing user by email.
 *
 * Session strategy is JWT (required by the Credentials provider). The Drizzle
 * adapter persists OAuth accounts. Runs on the Node runtime (uses `pg`).
 *
 * @spec L2-AUTH-02, L2-AUTH-05, L2-AUTH-09, L2-AUTH-10, L2-AUTH-11, L2-AUTH-36
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/backflip/login" },
  // Auth.js logs internally-caught errors (e.g. authorize/adapter failures)
  // with a full stack even when the response itself is a normal 200/redirect.
  // Compact that to name + message so dev logs stay readable.
  logger: {
    error: (error) => console.error(`[auth] ${error.name}: ${error.message}`),
    warn: (code) => console.warn(`[auth] ${code}`),
  },
  providers: [
    // Google only when configured; Credentials unless disabled (Google-only mode).
    ...(isGoogleConfigured()
      ? [Google({ allowDangerousEmailAccountLinking: true })]
      : []),
    ...(isCredentialsEnabled()
      ? [
          Credentials({
            credentials: {
              email: { label: "Email", type: "email" },
              password: { label: "Password", type: "password" },
            },
            authorize: async (creds) => {
              const email = typeof creds?.email === "string" ? creds.email : ""
              const password =
                typeof creds?.password === "string" ? creds.password : ""
              if (!email || !password) return null

              const user = await db.query.users.findFirst({
                where: eq(users.email, email),
              })
              if (!user?.passwordHash) return null

              const ok = await bcrypt.compare(password, user.passwordHash)
              if (!ok) return null

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role,
                tokenVersion: user.tokenVersion,
              }
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    // Google: reject unless a user with that email already exists.
    signIn: async ({ account, user, profile }) => {
      if (account?.provider !== "google") return true
      const email = user?.email ?? profile?.email
      if (!email) return false
      const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
      })
      return Boolean(existing)
    },
    jwt: async ({ token, user }) => {
      // Sign-in: stamp identity + the current token version into the JWT.
      if (user) {
        token.id = user.id
        token.role = user.role
        token.tokenVersion = user.tokenVersion ?? 0
        token.invalid = false
        return token
      }
      // Subsequent requests: revalidate against the DB so a password/email
      // change (which bumps tokenVersion) forces re-login everywhere.
      if (token.id) {
        const current = await db.query.users.findFirst({
          where: eq(users.id, token.id),
          columns: { role: true, tokenVersion: true },
        })
        if (!current || (current.tokenVersion ?? 0) !== (token.tokenVersion ?? 0)) {
          token.invalid = true
        } else {
          token.role = current.role
        }
      }
      return token
    },
    session: async ({ session, token }) => {
      // Revoked/stale JWT → drop identity so guards treat it as unauthenticated.
      if (token.invalid) {
        session.user = undefined as unknown as typeof session.user
        return session
      }
      if (token.id) session.user.id = token.id
      if (token.role) session.user.role = token.role
      return session
    },
  },
})
