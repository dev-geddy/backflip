"use server"

import { revalidatePath } from "next/cache"

import { aiConfig, db, decryptSecret, emailConfig, encryptSecret } from "@workspace/db"
import { eq, ne } from "drizzle-orm"

import { auth } from "@/app/_lib/auth"
import { canAccessSettings } from "@/app/_lib/auth/permissions"

import { fetchProviderModels, type ProviderModel } from "./_lib/provider-models"

/**
 * Admin settings actions — AI + Email provider config (upsert, key encryption,
 * single-default enforcement). Both `settings`-gated.
 *
 * @spec L2-AI-02, L2-AI-07, L2-AI-08, L2-EMAIL-02, L2-EMAIL-07
 */

const PROVIDERS = ["anthropic", "openai", "google"] as const
type Provider = (typeof PROVIDERS)[number]

export type SaveState = { ok: boolean; message: string } | null

export async function saveAiConfig(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const provider = String(formData.get("provider") ?? "")
  if (!PROVIDERS.includes(provider as Provider)) {
    return { ok: false, message: "Unknown provider" }
  }

  const model = (String(formData.get("model") ?? "").trim() || null) as
    string | null
  const enabled = formData.get("enabled") != null
  const isDefault = formData.get("isDefault") != null
  const apiKey = String(formData.get("apiKey") ?? "")

  const set: Record<string, unknown> = {
    model,
    enabled,
    isDefault,
    updatedAt: new Date(),
  }
  if (apiKey) set.apiKeyEnc = encryptSecret(apiKey)

  await db
    .insert(aiConfig)
    .values({ provider: provider as Provider, ...set })
    .onConflictDoUpdate({ target: aiConfig.provider, set })

  // Only one default provider.
  if (isDefault) {
    await db
      .update(aiConfig)
      .set({ isDefault: false })
      .where(ne(aiConfig.provider, provider as Provider))
  }

  revalidatePath("/backflip/settings")
  return { ok: true, message: "Saved." }
}

export type ListModelsState =
  | { ok: true; models: ProviderModel[] }
  | { ok: false; message: string }

/**
 * Live model list for a provider, fetched from its models API using the stored
 * (decrypted server-side) key. Key never leaves the server; only model ids and
 * labels are returned. No stored key → ok:false and the UI keeps its fallback
 * suggestions.
 *
 * @spec L2-AI-13
 */
export async function listAiModels(provider: string): Promise<ListModelsState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }
  if (!PROVIDERS.includes(provider as Provider)) {
    return { ok: false, message: "Unknown provider" }
  }

  const row = await db.query.aiConfig.findFirst({
    where: eq(aiConfig.provider, provider as Provider),
  })
  if (!row?.apiKeyEnc) {
    return { ok: false, message: "No API key saved for this provider yet." }
  }

  try {
    const models = await fetchProviderModels(
      provider as Provider,
      decryptSecret(row.apiKeyEnc)
    )
    if (models.length === 0) {
      return { ok: false, message: "Provider returned no models." }
    }
    return { ok: true, models }
  } catch {
    // Don't leak provider error bodies (may echo request details) to the UI.
    return {
      ok: false,
      message: "Could not fetch models — check the API key.",
    }
  }
}

/**
 * Upsert the single Resend email config row. Encrypts the API key when
 * supplied; blank key field keeps the existing key. Admin-gated.
 */
export async function saveEmailConfig(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const str = (k: string) => String(formData.get(k) ?? "").trim() || null
  const set: Record<string, unknown> = {
    provider: "resend",
    fromEmail: str("fromEmail"),
    fromName: str("fromName"),
    replyTo: str("replyTo"),
    enabled: formData.get("enabled") != null,
    updatedAt: new Date(),
  }
  const apiKey = String(formData.get("apiKey") ?? "")
  if (apiKey) set.apiKeyEnc = encryptSecret(apiKey)

  await db
    .insert(emailConfig)
    .values(set as typeof emailConfig.$inferInsert)
    .onConflictDoUpdate({ target: emailConfig.provider, set })

  revalidatePath("/backflip/settings")
  return { ok: true, message: "Saved." }
}
