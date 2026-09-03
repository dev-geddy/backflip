import "server-only"

import { chromePresets, db, userPreferences } from "@workspace/db"
import { and, desc, eq } from "drizzle-orm"

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
  /** True → the header is pinned and frosted over the page (`L2-UI-45`). */
  headerGlass: boolean
  /** Colors behind the `custom` theme; seeded until the user picks (`L2-UI-33`). */
  custom: { surface: string; accent: string }
}

export const DEFAULT_CHROME_PREFERENCES: ChromePreferences = {
  theme: "default",
  headerThemed: true,
  headerGlass: false,
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
      chromeHeaderGlass: true,
      chromeCustomSurface: true,
      chromeCustomAccent: true,
    },
  })
  return {
    theme: resolveChromeTheme(row?.chromeTheme),
    headerThemed: row?.chromeHeaderThemed ?? true,
    headerGlass: row?.chromeHeaderGlass ?? false,
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

/** Upsert whether the header floats over the page as frosted glass. */
export async function setChromeHeaderGlass(
  userId: string,
  chromeHeaderGlass: boolean
): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ userId, chromeHeaderGlass, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { chromeHeaderGlass, updatedAt: new Date() },
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

/* --------------------------- Saved chrome presets ------------------------- *
 * The user's own colour pairs for the `custom` theme (`L2-UI-55`). Separate
 * table rather than more columns on `user_preference`: this is a list, and the
 * preferences row is deliberately one row per user.
 * -------------------------------------------------------------------------- */

export type SavedChromePreset = {
  id: string
  name: string
  surface: string
  accent: string
}

/** One user's saved presets, newest first. */
export async function listChromePresets(
  userId: string
): Promise<SavedChromePreset[]> {
  return db
    .select({
      id: chromePresets.id,
      name: chromePresets.name,
      surface: chromePresets.surface,
      accent: chromePresets.accent,
    })
    .from(chromePresets)
    .where(eq(chromePresets.userId, userId))
    .orderBy(desc(chromePresets.createdAt))
}

/** How many presets a user already holds — checked against the cap on insert. */
export async function countChromePresets(userId: string): Promise<number> {
  const rows = await db
    .select({ id: chromePresets.id })
    .from(chromePresets)
    .where(eq(chromePresets.userId, userId))
  return rows.length
}

/**
 * Insert one preset. Caller validates the name and both colors. Saving under a
 * name the user already used overwrites that preset's colors rather than
 * failing the unique index — re-saving under a familiar name means "update
 * this one", which is also the only way to edit a preset.
 */
export async function insertChromePreset(
  userId: string,
  name: string,
  surface: string,
  accent: string
): Promise<void> {
  await db
    .insert(chromePresets)
    .values({ userId, name, surface, accent })
    .onConflictDoUpdate({
      target: [chromePresets.userId, chromePresets.name],
      set: { surface, accent },
    })
}

/** Delete one of the user's own presets. Scoped by `userId`, never by id alone. */
export async function deleteChromePresetRow(
  userId: string,
  id: string
): Promise<void> {
  await db
    .delete(chromePresets)
    .where(and(eq(chromePresets.id, id), eq(chromePresets.userId, userId)))
}
