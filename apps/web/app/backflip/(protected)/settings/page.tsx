import { aiConfig, db, emailConfig } from "@workspace/db"
import { eq } from "drizzle-orm"

import { requireCapability } from "@/app/_lib/auth/guard"
import { PageHeading, SectionLabel } from "../_components/page-heading"
import { AiSection } from "./_components/ai-section"
import { type ProviderConfig } from "./_components/ai-config-form"
import { type EmailConfig } from "./_components/email-config-form"
import { EmailSection } from "./_components/email-section"
import { keyPreview } from "./_lib/mask"

const PROVIDERS = ["anthropic", "openai", "google"] as const

/**
 * /backflip/settings — admin settings. Flat sections separated by rules:
 * AI integration (per provider), Email (Resend).
 * Secrets are never sent to the client; only whether a key is set.
 *
 * @spec L2-AI-01, L2-EMAIL-01
 */
export default async function SettingsPage() {
  await requireCapability("settings")

  const rows = await db.select().from(aiConfig)
  const byProvider = new Map(rows.map((r) => [r.provider, r]))

  const initial: ProviderConfig[] = PROVIDERS.map((provider) => {
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeading
        title="Settings"
        description="Configure platform integrations."
      />

      <section className="flex flex-col gap-3">
        <SectionLabel>AI integration</SectionLabel>
        <div className="rounded-xl border bg-card p-6">
          <AiSection initial={initial} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Email</SectionLabel>
        <div className="rounded-xl border bg-card p-6">
          <EmailSection initial={email} />
        </div>
      </section>
    </div>
  )
}
