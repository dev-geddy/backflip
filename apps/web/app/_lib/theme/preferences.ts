import "server-only"

import { chromePresets, db, userPreferences } from "@workspace/db"
import { and, asc, desc, eq } from "drizzle-orm"

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

const presetColumns = {
  id: chromePresets.id,
  name: chromePresets.name,
  surface: chromePresets.surface,
  accent: chromePresets.accent,
}

/**
 * The shipped palettes, alphabetical. Ownerless rows (`type = 'system'`), so
 * every user sees the same set and nobody can delete one.
 */
export async function listSystemPresets(): Promise<SavedChromePreset[]> {
  return db
    .select(presetColumns)
    .from(chromePresets)
    .where(eq(chromePresets.type, "system"))
    .orderBy(asc(chromePresets.createdAt))
}

/** One user's own presets, newest first. Never returns a system row. */
export async function listChromePresets(
  userId: string
): Promise<SavedChromePreset[]> {
  return db
    .select(presetColumns)
    .from(chromePresets)
    .where(
      and(eq(chromePresets.type, "user"), eq(chromePresets.userId, userId))
    )
    .orderBy(desc(chromePresets.createdAt))
}

/** How many presets a user already holds — checked against the cap on insert. */
export async function countChromePresets(userId: string): Promise<number> {
  const rows = await db
    .select({ id: chromePresets.id })
    .from(chromePresets)
    .where(
      and(eq(chromePresets.type, "user"), eq(chromePresets.userId, userId))
    )
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
    .values({ type: "user", userId, name, surface, accent })
    .onConflictDoUpdate({
      target: [chromePresets.userId, chromePresets.name],
      set: { surface, accent },
    })
}

/**
 * The user's own preset holding a given name, if any — the row a save under
 * that name would overwrite. Looked up rather than caught: the caller needs to
 * tell the user *which* preset is about to change, and the `(userId, name)`
 * unique index only reports the clash as a driver error.
 */
export async function findChromePresetByName(
  userId: string,
  name: string
): Promise<SavedChromePreset | undefined> {
  const [row] = await db
    .select(presetColumns)
    .from(chromePresets)
    .where(
      and(
        eq(chromePresets.type, "user"),
        eq(chromePresets.userId, userId),
        eq(chromePresets.name, name)
      )
    )
  return row
}

/**
 * Rename and/or re-colour one of the user's presets, addressed by id. Distinct
 * from `insertChromePreset`, which addresses by *name*: editing the name of a
 * preset you are looking at cannot be expressed as an upsert on the name, and
 * updating in place keeps the row's `createdAt` so the shelf does not reshuffle
 * under the edit.
 *
 * Scoped by owner *and* kind, so it can never touch a shipped preset. Returns
 * false when nothing matched — a deleted preset must not report success.
 */
export async function updateChromePresetRow(
  userId: string,
  id: string,
  name: string,
  surface: string,
  accent: string
): Promise<boolean> {
  const rows = await db
    .update(chromePresets)
    .set({ name, surface, accent })
    .where(
      and(
        eq(chromePresets.id, id),
        eq(chromePresets.type, "user"),
        eq(chromePresets.userId, userId)
      )
    )
    .returning({ id: chromePresets.id })
  return rows.length > 0
}

/** Delete one of the user's own presets. Scoped by `userId`, never by id alone. */
export async function deleteChromePresetRow(
  userId: string,
  id: string
): Promise<void> {
  // Scoped by owner *and* kind: a system row has a null `userId`, so the owner
  // check alone would already miss it, but stating the kind makes "this can
  // never delete a shipped preset" true by reading rather than by inference.
  await db
    .delete(chromePresets)
    .where(
      and(
        eq(chromePresets.id, id),
        eq(chromePresets.type, "user"),
        eq(chromePresets.userId, userId)
      )
    )
}
