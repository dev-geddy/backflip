import { aiConfig, analyticsConfig, db, emailConfig } from "@workspace/db"
import { eq } from "drizzle-orm"

import { requireCapability } from "@/app/_lib/auth/guard"
import { type ProviderConfig } from "./_components/ai-config-form"
import { type AnalyticsConfig } from "./_components/analytics-integration"
import { type EmailConfig } from "./_components/email-config-form"
import { IntegrationsView } from "./_components/integrations-view"
import { keyPreview } from "./_lib/mask"

const PROVIDERS = ["anthropic", "openai", "google"] as const

/**
 * /backflip/settings — admin Integrations (owner only). Master-detail over the
 * three real integrations: AI providers (per provider), Email (Resend) and
 * Google Analytics. Secrets are never sent to the client; only whether a key is
 * set + its masked preview. The GA measurement id is public, so it round-trips
 * in the clear.
 *
 * @spec L2-AI-01, L2-EMAIL-01, L2-ANALYTICS-05
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

  const [analyticsRow] = await db
    .select()
    .from(analyticsConfig)
    .where(eq(analyticsConfig.kind, "google_analytics"))
  const analytics: AnalyticsConfig = {
    measurementId: analyticsRow?.measurementId ?? "",
    cookieBannerEnabled: analyticsRow?.cookieBannerEnabled ?? true,
    cookieBannerText: analyticsRow?.cookieBannerText ?? "",
  }

  return <IntegrationsView ai={ai} email={email} analytics={analytics} />
}
