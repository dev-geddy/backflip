/**
 * The credentials the integrations page can remove, named by a stable id.
 *
 * Pure and client-safe on purpose: the same list types the `Remove` button in
 * the pane and validates the server action's argument, so a pane cannot ask to
 * clear something the action does not know how to clear.
 *
 * Slack apps and webhooks are absent: they are rows, and deleting the row is
 * already the way their token is deleted (`L2-SLACK-05`, `L2-SLACK-06`).
 */
export const CREDENTIAL_TARGETS = [
  "ai:anthropic",
  "ai:openai",
  "ai:google",
  "email",
  "speech",
  "clickup",
  "n8n",
] as const

export type CredentialTarget = (typeof CREDENTIAL_TARGETS)[number]

export function isCredentialTarget(value: string): value is CredentialTarget {
  return (CREDENTIAL_TARGETS as readonly string[]).includes(value)
}

/** `ai:openai` → `openai`; anything else → null. */
export function aiProviderOf(target: CredentialTarget): string | null {
  return target.startsWith("ai:") ? target.slice(3) : null
}
