import { aiConfig, db, emailConfig } from "@workspace/db"
import { Card } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { eq } from "drizzle-orm"

import { AiConfigForm, type ProviderConfig } from "./_components/ai-config-form"
import {
  EmailConfigForm,
  type EmailConfig,
} from "./_components/email-config-form"

const PROVIDERS = ["anthropic", "openai", "google"] as const

/**
 * /backflip/settings — admin settings. Flat sections separated by rules:
 * AI integration (per provider), Email (Resend).
 * Secrets are never sent to the client; only whether a key is set.
 */
export default async function SettingsPage() {
  const rows = await db.select().from(aiConfig)
  const byProvider = new Map(rows.map((r) => [r.provider, r]))

  const initial: ProviderConfig[] = PROVIDERS.map((provider) => {
    const r = byProvider.get(provider)
    return {
      provider,
      model: r?.model ?? "",
      enabled: r?.enabled ?? false,
      isDefault: r?.isDefault ?? false,
      hasKey: Boolean(r?.apiKeyEnc),
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
    hasKey: Boolean(emailRow?.apiKeyEnc),
  }

  return (
    <div className="flex w-full flex-col gap-6 px-4 lg:px-6">
      <Card className="p-6">
        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold">AI integration</h2>
          <div className="flex flex-col gap-6 md:flex-row md:gap-8">
            <div className="w-full md:max-w-md">
              <AiConfigForm initial={initial} />
            </div>
            <Separator orientation="vertical" className="hidden md:block" />
            <div className="w-full space-y-3 text-sm text-muted-foreground md:max-w-xs">
              <p>
                Configure providers for the AI SDK, then pick one default. The
                app calls the default provider unless overridden.
              </p>
              <p>
                API keys are encrypted at rest and never sent to the browser.
                Leave the key field blank to keep the current key.
              </p>
              <p>Only one provider can be the default at a time.</p>
              <p>
                The model chosen here is the provider&rsquo;s default.
                Individual AI features may request a different model at call
                time.
              </p>
            </div>
          </div>
        </section>
      </Card>

      <Card className="p-6">
        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold">Email</h2>
          <div className="flex flex-col gap-6 md:flex-row md:gap-8">
            <div className="w-full md:max-w-md">
              <EmailConfigForm initial={email} />
            </div>
            <Separator orientation="vertical" className="hidden md:block" />
            <div className="w-full space-y-3 text-sm text-muted-foreground md:max-w-xs">
              <p>Resend config for sending transactional email.</p>
              <p>
                The API key is encrypted at rest and never sent to the browser.
                Leave it blank to keep the current key.
              </p>
              <p>
                From email must be a verified sender on your Resend domain.
                Reply-to is optional.
              </p>
            </div>
          </div>
        </section>
      </Card>
    </div>
  )
}
