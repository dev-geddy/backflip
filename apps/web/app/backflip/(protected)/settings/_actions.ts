"use server"

import { revalidatePath } from "next/cache"

import { aiConfig, db, encryptSecret } from "@workspace/db"
import { ne } from "drizzle-orm"

import { auth } from "@/app/_lib/auth"

const PROVIDERS = ["anthropic", "openai", "google"] as const
type Provider = (typeof PROVIDERS)[number]

export type SaveState = { ok: boolean; message: string } | null

export async function saveAiConfig(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user) return { ok: false, message: "Unauthorized" }

  const provider = String(formData.get("provider") ?? "")
  if (!PROVIDERS.includes(provider as Provider)) {
    return { ok: false, message: "Unknown provider" }
  }

  const model = (String(formData.get("model") ?? "").trim() || null) as
    | string
    | null
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
