import { aiConfig, db } from "@workspace/db"

import { AiConfigForm, type ProviderConfig } from "./_components/ai-config-form"

const PROVIDERS = ["anthropic", "openai", "google"] as const

/**
 * /backflip/settings — admin settings. AI integration config (per provider).
 * API keys are never sent to the client; only whether a key is set.
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold">AI integration</h2>
        <p className="text-sm text-muted-foreground">
          Configure providers for the AI SDK. Pick a default; API keys are
          encrypted at rest.
        </p>
      </div>
      <AiConfigForm initial={initial} />
    </div>
  )
}
