import { and, eq, isNull } from "drizzle-orm"

import { db, generateToken, hashToken, userTokens } from "@workspace/db"

export type UserTokenType = "password_reset" | "email_change"

/** Default lifetimes (minutes) for one-time tokens. */
const TTL_MINUTES: Record<UserTokenType, number> = {
  password_reset: 60,
  email_change: 60,
}

/**
 * Mint a single-use token for `userId`. Any un-consumed token of the same type
 * for that user is invalidated first (one live token per purpose). Returns the
 * RAW token — put it in the emailed link; only its hash is persisted.
 */
export async function createUserToken(params: {
  userId: string
  type: UserTokenType
  /** Pending address, for `email_change` only. */
  newEmail?: string
}): Promise<string> {
  const { userId, type, newEmail } = params

  // Invalidate any outstanding tokens of this type (mark consumed).
  await db
    .update(userTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(userTokens.userId, userId),
        eq(userTokens.type, type),
        isNull(userTokens.consumedAt)
      )
    )

  const raw = generateToken()
  const expiresAt = new Date(Date.now() + TTL_MINUTES[type] * 60_000)

  await db.insert(userTokens).values({
    userId,
    type,
    tokenHash: hashToken(raw),
    newEmail: newEmail ?? null,
    expiresAt,
  })

  return raw
}

export type ConsumedToken = {
  userId: string
  newEmail: string | null
}

/**
 * Validate + consume a raw token. Succeeds only if a matching row exists, is of
 * the given `type`, is un-consumed, and is not expired. Marks it consumed
 * (single use) and returns its `userId`/`newEmail`. Any failure → null.
 */
export async function consumeUserToken(params: {
  rawToken: string
  type: UserTokenType
}): Promise<ConsumedToken | null> {
  const { rawToken, type } = params
  if (!rawToken) return null

  const [row] = await db
    .select()
    .from(userTokens)
    .where(eq(userTokens.tokenHash, hashToken(rawToken)))

  if (!row) return null
  if (row.type !== type) return null
  if (row.consumedAt) return null
  if (row.expiresAt.getTime() < Date.now()) return null

  await db
    .update(userTokens)
    .set({ consumedAt: new Date() })
    .where(eq(userTokens.id, row.id))

  return { userId: row.userId, newEmail: row.newEmail }
}
