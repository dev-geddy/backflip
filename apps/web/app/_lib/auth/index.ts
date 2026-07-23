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

import "./types"

/**
 * Auth.js (v5) config. Two providers:
 * - Credentials — email + password against `user.passwordHash` (bcrypt).
 * - Google — OAuth, but ONLY for emails already registered on the platform
 *   (enforced in the `signIn` callback). Links to the existing user by email.
 *
 * Session strategy is JWT (required by the Credentials provider). The Drizzle
 * adapter persists OAuth accounts. Runs on the Node runtime (uses `pg`).
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
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
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
        }
      },
    }),
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
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session: async ({ session, token }) => {
      if (token.id) session.user.id = token.id
      if (token.role) session.user.role = token.role
      return session
    },
  },
})
