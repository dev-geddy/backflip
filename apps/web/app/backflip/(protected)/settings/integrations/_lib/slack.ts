import "server-only"

/**
 * Slack probes. Both run server-side with a decrypted credential — bot token
 * or webhook URL — and return only what is safe to show an operator.
 *
 * `auth.test` is Slack's canonical "is this token alive" call and hands back
 * the workspace + bot identity, which is what the app list displays. Incoming
 * webhooks have no read API at all: the only way to verify one is to post to
 * it, so the webhook test is an explicit, operator-triggered message.
 *
 * @spec L2-SLACK-05, L2-SLACK-06
 */

const TIMEOUT_MS = 10_000

export type SlackIdentity = {
  /** Workspace name (`team`), shown in the app row. */
  teamName: string
  /** Bot user id (`user_id`) — the closest thing to an app identity here. */
  appId: string | null
  botUser: string | null
}

/** Verify a bot token via `auth.test`. Throws with Slack's error code. */
export async function slackAuthTest(botToken: string): Promise<SlackIdentity> {
  const res = await fetch("https://slack.com/api/auth.test", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`slack responded ${res.status}`)
  }
  // Slack answers 200 even on failure — `ok: false` + an `error` code is the
  // real status.
  const body = (await res.json()) as {
    ok?: boolean
    error?: string
    team?: string
    user?: string
    user_id?: string
  }
  if (!body.ok) {
    throw new Error(body.error ?? "slack rejected the token")
  }
  return {
    teamName: body.team ?? "Unknown workspace",
    appId: body.user_id ?? null,
    botUser: body.user ?? null,
  }
}

/**
 * Post a message to an incoming webhook. This really does deliver to the
 * channel — the UI states that before the operator triggers it. A webhook
 * answers `ok` in plain text, or an error string like `no_service`.
 */
export async function postSlackWebhook(
  url: string,
  text: string
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  })
  const body = (await res.text()).trim()
  if (!res.ok || body !== "ok") {
    throw new Error(body || `slack responded ${res.status}`)
  }
}

/** Incoming-webhook URLs all live under this prefix. */
export function isSlackWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "hooks.slack.com" &&
      parsed.pathname.startsWith("/services/")
    )
  } catch {
    return false
  }
}
