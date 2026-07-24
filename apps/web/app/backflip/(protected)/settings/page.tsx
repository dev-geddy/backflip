import { aiConfig, db, emailConfig } from "@workspace/db"
import { eq } from "drizzle-orm"

import { requireCapability } from "@/app/_lib/auth/guard"
import { type ProviderConfig } from "./_components/ai-config-form"
import { type EmailConfig } from "./_components/email-config-form"
import { IntegrationsView } from "./_components/integrations-view"
import { keyPreview } from "./_lib/mask"

const PROVIDERS = ["anthropic", "openai", "google"] as const

/**
 * /backflip/settings — admin Integrations (owner only). Master-detail over the
 * two real integrations: AI providers (per provider) and Email (Resend).
 * Secrets are never sent to the client; only whether a key is set + its masked
 * preview.
 *
 * @spec L2-AI-01, L2-EMAIL-01
 */
export default async function SettingsPage() {
  await requireCapability("settings")

  const rows = await db.select().from(aiConfig)
  const byProvider = new Map(rows.map((r) => [r.provider, r]))

  const ai: ProviderConfig[] = PROVIDERS.map((provider) => {
    const r = byProvider.get(provider)
    return {
      provider,
      model: r?.model ?? "",
      enabled: r?.enabled ?? false,
      isDefault: r?.isDefault ?? false,
      keyPreview: keyPreview(r?.apiKeyEnc),
    }
  })

  const [emailRow] = await db
    .select()
    .from(emailConfig)
    .where(eq(emailConfig.provider, "resend"))
  const email: EmailConfig = {
    fromEmail: emailRow?.fromEmail ?? "",
    fromName: emailRow?.fromName ?? "",
    replyTo: emailRow?.replyTo ?? "",
    enabled: emailRow?.enabled ?? false,
    keyPreview: keyPreview(emailRow?.apiKeyEnc),
  }

  return <IntegrationsView ai={ai} email={email} />
}
