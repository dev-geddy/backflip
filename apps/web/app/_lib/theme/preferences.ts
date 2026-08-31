import "server-only"

import { db, userPreferences } from "@workspace/db"
import { eq } from "drizzle-orm"

import {
  CUSTOM_CHROME_SEED,
  resolveChromeTheme,
  type ChromeThemeId,
} from "./chrome-themes"

/**
 * Per-user UI preferences (`user_preference`). A missing row means "all
 * defaults" — the shell never seeds one, so a user who has never opened the
 * picker costs a single indexed read and nothing else.
 *
 * @spec L2-UI-27
 */

export type ChromePreferences = {
  theme: ChromeThemeId
  /** False → the header keeps the plain light/dark chrome (`L2-UI-32`). */
  headerThemed: boolean
  /** Colors behind the `custom` theme; seeded until the user picks (`L2-UI-33`). */
  custom: { surface: string; accent: string }
}

export const DEFAULT_CHROME_PREFERENCES: ChromePreferences = {
  theme: "default",
  headerThemed: true,
  custom: CUSTOM_CHROME_SEED,
}

/** The signed-in user's chrome preferences, falling back to the defaults. */
export async function getChromePreferences(
  userId: string
): Promise<ChromePreferences> {
  const row = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
    columns: {
      chromeTheme: true,
      chromeHeaderThemed: true,
      chromeCustomSurface: true,
      chromeCustomAccent: true,
    },
  })
  return {
    theme: resolveChromeTheme(row?.chromeTheme),
    headerThemed: row?.chromeHeaderThemed ?? true,
    custom: {
      surface: row?.chromeCustomSurface ?? CUSTOM_CHROME_SEED.surface,
      accent: row?.chromeCustomAccent ?? CUSTOM_CHROME_SEED.accent,
    },
  }
}

/** Upsert the chrome theme for one user. Caller validates the id. */
export async function setChromeTheme(
  userId: string,
  chromeTheme: ChromeThemeId
): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ userId, chromeTheme, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { chromeTheme, updatedAt: new Date() },
    })
}

/** Upsert whether the theme also tints the header. */
export async function setChromeHeaderThemed(
  userId: string,
  chromeHeaderThemed: boolean
): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ userId, chromeHeaderThemed, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { chromeHeaderThemed, updatedAt: new Date() },
    })
}

/** Upsert the custom palette. Caller validates both colors are `#rrggbb`. */
export async function setCustomChrome(
  userId: string,
  surface: string,
  accent: string
): Promise<void> {
  const set = {
    chromeCustomSurface: surface,
    chromeCustomAccent: accent,
    updatedAt: new Date(),
  }
  await db
    .insert(userPreferences)
    .values({ userId, ...set })
    .onConflictDoUpdate({ target: userPreferences.userId, set })
}
