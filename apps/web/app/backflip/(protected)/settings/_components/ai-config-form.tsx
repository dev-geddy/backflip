export type ProviderConfig = {
  provider: "anthropic" | "openai" | "google"
  model: string
  enabled: boolean
  isDefault: boolean
  keyPreview: string | null
}

export const LABEL: Record<ProviderConfig["provider"], string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  google: "Google (Gemini)",
}

/** AI SDK package per provider — shown as a mono badge in the pane header. */
export const PACKAGE: Record<ProviderConfig["provider"], string> = {
  anthropic: "@ai-sdk/anthropic",
  openai: "@ai-sdk/openai",
  google: "@ai-sdk/google",
}
