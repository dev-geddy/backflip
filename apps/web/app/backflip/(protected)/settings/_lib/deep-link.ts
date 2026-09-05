/**
 * Which integration (and, for AI, which provider) the page is looking at,
 * carried in the query string so the pane survives a reload and can be linked
 * to. Pure and client-safe: the server component reads the same resolvers to
 * pick the first render, so a deep link never flashes the default pane first.
 *
 * @spec L2-UI-59
 */

export const INTEGRATION_IDS = [
  "ai",
  "email",
  "analytics",
  "speech",
  "connectors",
  "clickup",
  "slack",
  "n8n",
] as const

export type IntegrationId = (typeof INTEGRATION_IDS)[number]

export const AI_PROVIDER_IDS = ["anthropic", "openai", "google"] as const

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number]

/** Anything unknown narrows back to the first pane, never throws. */
export function resolveIntegration(value: unknown): IntegrationId {
  return typeof value === "string" &&
    (INTEGRATION_IDS as readonly string[]).includes(value)
    ? (value as IntegrationId)
    : "ai"
}

export function resolveAiProvider(value: unknown): AiProviderId {
  return typeof value === "string" &&
    (AI_PROVIDER_IDS as readonly string[]).includes(value)
    ? (value as AiProviderId)
    : "anthropic"
}

/**
 * The query string for one pane. `provider` is carried only by the AI pane —
 * it means nothing beside Resend or Slack, and a stale `provider=openai`
 * riding along would be read back on the next load.
 */
export function integrationQuery(
  integration: IntegrationId,
  provider?: string | null
): string {
  const params = new URLSearchParams({ integration })
  if (integration === "ai" && provider) params.set("provider", provider)
  return `?${params.toString()}`
}
