"use server"

import { revalidatePath } from "next/cache"

import {
  aiConfig,
  analyticsConfig,
  clickupConfig,
  db,
  decryptSecret,
  emailConfig,
  encryptSecret,
  n8nConfig,
  slackApps,
  slackWebhooks,
  speechConfig,
} from "@workspace/db"
import { eq, ne } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/app/_lib/auth"
import { canAccessSettings } from "@/app/_lib/auth/permissions"
import {
  createManualClient,
  deleteClient,
  isValidRedirectUri,
} from "@/app/_lib/oauth/clients"
import {
  getConnectorSettings,
  isValidHostEntry,
  saveConnectorSettings,
} from "@/app/_lib/oauth/connector-config"
import { firstError } from "@/app/_lib/validation"

import { fetchClickupIdentity } from "./_lib/clickup"
import { fetchDeepgramModels, type SpeechModel } from "./_lib/deepgram-models"
import { fetchN8nStatus, normalizeN8nBaseUrl } from "./_lib/n8n"
import { fetchProviderModels, type ProviderModel } from "./_lib/provider-models"
import {
  isSlackWebhookUrl,
  postSlackWebhook,
  slackAuthTest,
} from "./_lib/slack"

/**
 * Admin settings actions — AI + Email + Analytics + Speech + ClickUp + Slack +
 * n8n config (upsert, key encryption, single-default enforcement, connection
 * probes). All `settings`-gated.
 *
 * @spec L2-AI-02, L2-AI-07, L2-AI-08, L2-EMAIL-02, L2-EMAIL-07,
 *       L2-ANALYTICS-02, L2-SPEECH-02, L2-SPEECH-04, L2-MCP-47, L2-MCP-49,
 *       L2-MCP-50, L2-MCP-52, L2-MCP-53, L2-CLICKUP-02, L2-CLICKUP-03,
 *       L2-SLACK-03, L2-SLACK-04, L2-SLACK-05, L2-SLACK-06, L2-N8N-02,
 *       L2-N8N-03
 */

const PROVIDERS = ["anthropic", "openai", "google"] as const
type Provider = (typeof PROVIDERS)[number]

export type SaveState = { ok: boolean; message: string } | null

export async function saveAiConfig(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const provider = String(formData.get("provider") ?? "")
  if (!PROVIDERS.includes(provider as Provider)) {
    return { ok: false, message: "Unknown provider" }
  }

  const model = (String(formData.get("model") ?? "").trim() || null) as
    string | null
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

export type ListModelsState =
  { ok: true; models: ProviderModel[] } | { ok: false; message: string }

/**
 * Live model list for a provider, fetched from its models API using the stored
 * (decrypted server-side) key. Key never leaves the server; only model ids and
 * labels are returned. No stored key → ok:false and the UI keeps its fallback
 * suggestions.
 *
 * @spec L2-AI-13
 */
export async function listAiModels(provider: string): Promise<ListModelsState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }
  if (!PROVIDERS.includes(provider as Provider)) {
    return { ok: false, message: "Unknown provider" }
  }

  const row = await db.query.aiConfig.findFirst({
    where: eq(aiConfig.provider, provider as Provider),
  })
  if (!row?.apiKeyEnc) {
    return { ok: false, message: "No API key saved for this provider yet." }
  }

  try {
    const models = await fetchProviderModels(
      provider as Provider,
      decryptSecret(row.apiKeyEnc)
    )
    if (models.length === 0) {
      return { ok: false, message: "Provider returned no models." }
    }
    return { ok: true, models }
  } catch {
    // Don't leak provider error bodies (may echo request details) to the UI.
    return {
      ok: false,
      message: "Could not fetch models — check the API key.",
    }
  }
}

/**
 * Upsert the single Resend email config row. Encrypts the API key when
 * supplied; blank key field keeps the existing key. Admin-gated.
 */
export async function saveEmailConfig(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const str = (k: string) => String(formData.get(k) ?? "").trim() || null
  const set: Record<string, unknown> = {
    provider: "resend",
    fromEmail: str("fromEmail"),
    fromName: str("fromName"),
    replyTo: str("replyTo"),
    enabled: formData.get("enabled") != null,
    updatedAt: new Date(),
  }
  const apiKey = String(formData.get("apiKey") ?? "")
  if (apiKey) set.apiKeyEnc = encryptSecret(apiKey)

  await db
    .insert(emailConfig)
    .values(set as typeof emailConfig.$inferInsert)
    .onConflictDoUpdate({ target: emailConfig.provider, set })

  revalidatePath("/backflip/settings")
  return { ok: true, message: "Saved." }
}

/**
 * Google Analytics measurement ids: GA4 (`G-`), Google Tag (`GT-`), Ads (`AW-`)
 * and legacy Universal Analytics (`UA-`). The id is interpolated into the
 * gtag.js URL and `gtag("config", …)` on public pages, so it is validated
 * strictly here (allow-list charset) rather than trusted.
 */
const MEASUREMENT_ID = /^(G|GT|AW|UA)-[A-Z0-9]+(-[A-Z0-9]+)?$/

/**
 * Upsert the single Google Analytics config row. The measurement id is public
 * (it ships to every visitor) so it is stored in plaintext — no encryption, no
 * masking. Blank id clears it, which turns analytics off entirely. Admin-gated.
 *
 * Public pages read this through `GET /api/public/analytics-config`, which is
 * cached for ~5 min — a change can take that long to reach visitors.
 */
export async function saveAnalyticsConfig(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const raw = String(formData.get("measurementId") ?? "")
    .trim()
    .toUpperCase()
  if (raw && !MEASUREMENT_ID.test(raw)) {
    return {
      ok: false,
      message: "Measurement ID looks wrong — expected a tag like G-XXXXXXXXXX.",
    }
  }

  const set = {
    kind: "google_analytics",
    measurementId: raw || null,
    cookieBannerEnabled: formData.get("cookieBannerEnabled") != null,
    cookieBannerText:
      String(formData.get("cookieBannerText") ?? "").trim() || null,
    updatedAt: new Date(),
  }

  await db
    .insert(analyticsConfig)
    .values(set)
    .onConflictDoUpdate({ target: analyticsConfig.kind, set })

  revalidatePath("/backflip/settings")
  return { ok: true, message: "Saved." }
}

/**
 * Upsert the single Deepgram speech config row. Encrypts the API key when
 * supplied; blank key field keeps the existing key. Admin-gated.
 */
export async function saveSpeechConfig(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const str = (k: string) => String(formData.get(k) ?? "").trim() || null
  const set: Record<string, unknown> = {
    provider: "deepgram",
    sttModel: str("sttModel"),
    ttsModel: str("ttsModel"),
    enabled: formData.get("enabled") != null,
    updatedAt: new Date(),
  }
  const apiKey = String(formData.get("apiKey") ?? "")
  if (apiKey) set.apiKeyEnc = encryptSecret(apiKey)

  await db
    .insert(speechConfig)
    .values(set as typeof speechConfig.$inferInsert)
    .onConflictDoUpdate({ target: speechConfig.provider, set })

  revalidatePath("/backflip/settings")
  return { ok: true, message: "Saved." }
}

export type ListSpeechModelsState =
  { ok: true; models: SpeechModel[] } | { ok: false; message: string }

/**
 * Live STT + TTS model list from Deepgram, fetched with the stored (decrypted
 * server-side) key. Key never leaves the server; only model names do.
 */
export async function listSpeechModels(): Promise<ListSpeechModelsState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const row = await db.query.speechConfig.findFirst({
    where: eq(speechConfig.provider, "deepgram"),
  })
  if (!row?.apiKeyEnc) {
    return { ok: false, message: "No API key saved yet." }
  }

  try {
    const models = await fetchDeepgramModels(decryptSecret(row.apiKeyEnc))
    if (models.length === 0) {
      return { ok: false, message: "Deepgram returned no models." }
    }
    return { ok: true, models }
  } catch {
    // Don't leak provider error bodies (may echo request details) to the UI.
    return { ok: false, message: "Could not fetch models — check the API key." }
  }
}

/**
 * Connector (MCP) administration — owner-only. The enable/disable master
 * switch, registration mode, the redirect-host allowlist, and manual OAuth
 * clients. Every action re-checks the `settings` capability itself; the
 * tab's visibility in the UI is cosmetic only (`L2-AUTH-22`).
 *
 * @spec L2-MCP-25, L2-MCP-47, L2-MCP-49, L2-MCP-50, L2-MCP-52, L2-MCP-53
 */

export type ConnectorActionState = { ok: boolean; message: string } | null

/**
 * Enable or disable the connector — the owner-toggled master switch that
 * replaces the old `MCP_ENABLED` env-only gate (`L2-MCP-25`). The UI control
 * is cosmetic only: this re-checks `settings` itself, and never trusts a
 * client-supplied user id (`L2-AUTH-22`). `MCP_ENABLED=false` still vetoes the
 * resolved enabled state regardless of what gets stored here (`L2-MCP-37`) —
 * `ConnectorEnable` disables its own switch in that case, but this action
 * doesn't need to special-case it: storing `enabled: true` while forced off is
 * harmless and simply takes effect once the override is lifted.
 */
export async function setConnectorEnabled(
  _prev: ConnectorActionState,
  formData: FormData
): Promise<ConnectorActionState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const enabled = formData.get("enabled") != null
  await saveConnectorSettings({ enabled })
  revalidatePath("/backflip/settings")
  return {
    ok: true,
    message: enabled ? "Connector enabled." : "Connector disabled.",
  }
}

const DCR_MODES = ["off", "allowlist", "open"] as const
const dcrModeSchema = z.enum(DCR_MODES)

/** Save the dynamic-client-registration mode (`L2-MCP-47`). */
export async function saveDcrMode(
  _prev: ConnectorActionState,
  formData: FormData
): Promise<ConnectorActionState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const parsed = dcrModeSchema.safeParse(formData.get("dcrMode"))
  if (!parsed.success) {
    return { ok: false, message: "Unknown registration mode." }
  }

  await saveConnectorSettings({ dcrMode: parsed.data })
  revalidatePath("/backflip/settings")
  return { ok: true, message: "Saved." }
}

/**
 * Add a host to the redirect allowlist. Bare hostname only, validated by the
 * same `isValidHostEntry` the client-side hint uses, so the two never
 * disagree.
 */
export async function addRedirectHost(
  _prev: ConnectorActionState,
  formData: FormData
): Promise<ConnectorActionState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const host = String(formData.get("host") ?? "")
    .trim()
    .toLowerCase()
  if (!isValidHostEntry(host)) {
    return {
      ok: false,
      message: "Enter a bare hostname — no scheme, port, path or wildcard.",
    }
  }

  const current = await getConnectorSettings()
  if (current.redirectHosts.includes(host)) {
    return { ok: false, message: "That host is already on the allowlist." }
  }

  try {
    await saveConnectorSettings({
      redirectHosts: [...current.redirectHosts, host],
    })
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Couldn't add host.",
    }
  }
  revalidatePath("/backflip/settings")
  return { ok: true, message: `Added ${host}.` }
}

/**
 * Remove a host from the redirect allowlist. Takes effect immediately for
 * any client whose registered redirect URI used that host (`L2-MCP-49`) — the
 * UI carries its own warning copy, this action just does the removal.
 */
export async function removeRedirectHost(
  _prev: ConnectorActionState,
  formData: FormData
): Promise<ConnectorActionState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const host = String(formData.get("host") ?? "")
    .trim()
    .toLowerCase()
  if (!host) return { ok: false, message: "Missing host." }

  const current = await getConnectorSettings()
  await saveConnectorSettings({
    redirectHosts: current.redirectHosts.filter((h) => h !== host),
  })
  revalidatePath("/backflip/settings")
  return { ok: true, message: `Removed ${host}.` }
}

const createClientSchema = z.object({
  clientName: z.string().trim().min(1, "Name is required.").max(200),
  redirectUris: z.array(z.string()).min(1, "Add at least one redirect URI."),
  allowLoopbackPorts: z.boolean(),
})

export type CreateClientState =
  | {
      ok: true
      message: string
      client: { clientId: string; clientName: string }
      /** Native (loopback) clients get no secret — PKCE stands in (RFC 8252). */
      clientSecret: string | null
    }
  | { ok: false; message: string }
  | null

/**
 * Create a manual OAuth client. Returns the raw `client_secret` exactly once
 * — the caller must show it to the owner now, it is never retrievable again
 * (`L2-MCP-50`). A native client (`allowLoopbackPorts`) gets `clientSecret:
 * null` instead, since a public native app can't hold one (`L2-MCP-52`).
 * `createdByUserId` always comes from the session, never the client.
 */
export async function createConnectorClient(
  _prev: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const redirectUris = Array.from(
    new Set(
      String(formData.get("redirectUris") ?? "")
        .split("\n")
        .map((uri) => uri.trim())
        .filter(Boolean)
    )
  )

  const parsed = createClientSchema.safeParse({
    clientName: String(formData.get("clientName") ?? ""),
    redirectUris,
    allowLoopbackPorts: formData.get("allowLoopbackPorts") != null,
  })
  if (!parsed.success) {
    return { ok: false, message: firstError(parsed.error) }
  }

  const invalidUri = parsed.data.redirectUris.find(
    (uri) => !isValidRedirectUri(uri)
  )
  if (invalidUri) {
    return { ok: false, message: `Not a valid redirect URI: ${invalidUri}` }
  }

  try {
    const { client, clientSecret } = await createManualClient({
      clientName: parsed.data.clientName,
      redirectUris: parsed.data.redirectUris,
      allowLoopbackPorts: parsed.data.allowLoopbackPorts,
      createdByUserId: session.user.id,
    })
    revalidatePath("/backflip/settings")
    return {
      ok: true,
      message: "Client created.",
      client: { clientId: client.clientId, clientName: client.clientName },
      clientSecret: clientSecret || null,
    }
  } catch (error) {
    // `createManualClient` throws user-facing messages by design (invalid
    // name/URI, or a redirect host that isn't on the allowlist, `L2-MCP-49`)
    // — surface them as-is rather than a generic fallback.
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't create the client.",
    }
  }
}

/**
 * Delete a manual or dynamic client. Immediate: any token already issued to
 * it stops working on its next use (bearer lookup fails once the client row
 * is gone).
 */
export async function deleteConnectorClient(
  clientDbId: string
): Promise<ConnectorActionState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }
  if (!clientDbId) return { ok: false, message: "Missing client id." }

  await deleteClient(clientDbId)
  revalidatePath("/backflip/settings")
  return { ok: true, message: "Client deleted." }
}

/**
 * ClickUp administration — single config row plus a live connection probe.
 * Auth today is a personal API token; the reserved OAuth columns
 * (`clientId`/`clientSecretEnc`) are never written here.
 *
 * @spec L2-CLICKUP-02, L2-CLICKUP-03
 */

/**
 * Upsert the single `clickup_config` row. Encrypts the token when supplied;
 * a blank token field keeps the stored one. `settings`-gated.
 */
export async function saveClickupConfig(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const set: Record<string, unknown> = {
    kind: "clickup",
    teamId: String(formData.get("teamId") ?? "").trim() || null,
    enabled: formData.get("enabled") != null,
    updatedAt: new Date(),
  }
  const apiToken = String(formData.get("apiToken") ?? "")
  if (apiToken) set.apiTokenEnc = encryptSecret(apiToken)

  await db
    .insert(clickupConfig)
    .values(set as typeof clickupConfig.$inferInsert)
    .onConflictDoUpdate({ target: clickupConfig.kind, set })

  revalidatePath("/backflip/settings")
  return { ok: true, message: "Saved." }
}

/**
 * Probe ClickUp with the stored token (decrypted server-side only) and report
 * the identity it resolves to. Read-only — nothing in ClickUp changes.
 */
export async function testClickupConnection(): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const row = await db.query.clickupConfig.findFirst({
    where: eq(clickupConfig.kind, "clickup"),
  })
  if (!row?.apiTokenEnc) {
    return { ok: false, message: "Save an API token first." }
  }

  try {
    const identity = await fetchClickupIdentity(decryptSecret(row.apiTokenEnc))
    const teams = identity.teams.length
    return {
      ok: true,
      message: `Connected as ${identity.username} · ${teams} workspace${teams === 1 ? "" : "s"}.`,
    }
  } catch {
    // Don't leak provider error bodies (may echo request details) to the UI.
    return { ok: false, message: "Could not reach ClickUp — check the token." }
  }
}

/**
 * Slack administration — many apps (bot tokens) and many incoming webhooks,
 * each row created, tested and deleted independently.
 *
 * @spec L2-SLACK-03, L2-SLACK-04, L2-SLACK-05, L2-SLACK-06
 */

const slackAppSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  defaultChannel: z.string().trim().max(120).nullable(),
})

/**
 * Create or update one Slack app. `id` absent → create (a bot token is
 * required, there is nothing to keep). `id` present → update; blank token or
 * signing-secret fields keep the stored values (`L2-SLACK-07`).
 */
export async function saveSlackApp(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const id = String(formData.get("id") ?? "").trim()
  const parsed = slackAppSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    defaultChannel: String(formData.get("defaultChannel") ?? "").trim() || null,
  })
  if (!parsed.success) {
    return { ok: false, message: firstError(parsed.error) }
  }

  const botToken = String(formData.get("botToken") ?? "").trim()
  const signingSecret = String(formData.get("signingSecret") ?? "").trim()
  if (!id && !botToken) {
    return { ok: false, message: "A bot token is required." }
  }
  if (botToken && !botToken.startsWith("xoxb-")) {
    return { ok: false, message: "Bot tokens start with xoxb-." }
  }

  const set: Record<string, unknown> = {
    name: parsed.data.name,
    defaultChannel: parsed.data.defaultChannel,
    enabled: formData.get("enabled") != null,
    updatedAt: new Date(),
  }
  if (botToken) set.botTokenEnc = encryptSecret(botToken)
  if (signingSecret) set.signingSecretEnc = encryptSecret(signingSecret)

  try {
    if (id) {
      await db.update(slackApps).set(set).where(eq(slackApps.id, id))
    } else {
      await db.insert(slackApps).values(set as typeof slackApps.$inferInsert)
    }
  } catch {
    // The only constraint that can fail here is the unique name.
    return { ok: false, message: "An app with that name already exists." }
  }

  revalidatePath("/backflip/settings")
  return { ok: true, message: "Saved." }
}

/** Delete one Slack app. Its token stops being usable immediately. */
export async function deleteSlackApp(id: string): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }
  if (!id) return { ok: false, message: "Missing app id." }

  await db.delete(slackApps).where(eq(slackApps.id, id))
  revalidatePath("/backflip/settings")
  return { ok: true, message: "App removed." }
}

/**
 * Verify one app's bot token via `auth.test` and store the workspace/bot
 * identity it returns. Read-only in Slack — nothing is posted.
 */
export async function testSlackApp(id: string): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const row = await db.query.slackApps.findFirst({
    where: eq(slackApps.id, id),
  })
  if (!row) return { ok: false, message: "Unknown app." }
  if (!row.botTokenEnc) return { ok: false, message: "Save a bot token first." }

  try {
    const identity = await slackAuthTest(decryptSecret(row.botTokenEnc))
    await db
      .update(slackApps)
      .set({
        teamName: identity.teamName,
        appId: identity.appId,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(slackApps.id, id))
    revalidatePath("/backflip/settings")
    return {
      ok: true,
      message: `Connected to ${identity.teamName}${identity.botUser ? ` as ${identity.botUser}` : ""}.`,
    }
  } catch {
    return { ok: false, message: "Slack rejected the token." }
  }
}

const slackWebhookSchema = z.object({
  label: z.string().trim().min(1, "Label is required.").max(120),
  channel: z.string().trim().max(120).nullable(),
})

/**
 * Create or update one incoming webhook. The URL is the credential, so it is
 * encrypted like any other secret; on update a blank URL field keeps the
 * stored one (`L2-SLACK-07`).
 */
export async function saveSlackWebhook(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const id = String(formData.get("id") ?? "").trim()
  const parsed = slackWebhookSchema.safeParse({
    label: String(formData.get("label") ?? ""),
    channel: String(formData.get("channel") ?? "").trim() || null,
  })
  if (!parsed.success) {
    return { ok: false, message: firstError(parsed.error) }
  }

  const url = String(formData.get("url") ?? "").trim()
  if (!id && !url) {
    return { ok: false, message: "A webhook URL is required." }
  }
  if (url && !isSlackWebhookUrl(url)) {
    return {
      ok: false,
      message: "Expected a https://hooks.slack.com/services/… URL.",
    }
  }

  const set: Record<string, unknown> = {
    label: parsed.data.label,
    channel: parsed.data.channel,
    enabled: formData.get("enabled") != null,
    updatedAt: new Date(),
  }
  if (url) set.urlEnc = encryptSecret(url)

  try {
    if (id) {
      await db.update(slackWebhooks).set(set).where(eq(slackWebhooks.id, id))
    } else {
      await db
        .insert(slackWebhooks)
        .values(set as typeof slackWebhooks.$inferInsert)
    }
  } catch {
    return { ok: false, message: "A webhook with that label already exists." }
  }

  revalidatePath("/backflip/settings")
  return { ok: true, message: "Saved." }
}

/** Delete one incoming webhook. */
export async function deleteSlackWebhook(id: string): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }
  if (!id) return { ok: false, message: "Missing webhook id." }

  await db.delete(slackWebhooks).where(eq(slackWebhooks.id, id))
  revalidatePath("/backflip/settings")
  return { ok: true, message: "Webhook removed." }
}

/**
 * Test one webhook by posting to it. Slack gives incoming webhooks no read
 * API, so this genuinely delivers a message to the channel — the UI says so
 * before the operator triggers it (`L2-SLACK-06`).
 */
export async function testSlackWebhook(id: string): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const row = await db.query.slackWebhooks.findFirst({
    where: eq(slackWebhooks.id, id),
  })
  if (!row) return { ok: false, message: "Unknown webhook." }

  try {
    await postSlackWebhook(
      decryptSecret(row.urlEnc),
      `Test message from Backflip — webhook “${row.label}” is working.`
    )
    await db
      .update(slackWebhooks)
      .set({ lastCheckedAt: new Date(), updatedAt: new Date() })
      .where(eq(slackWebhooks.id, id))
    revalidatePath("/backflip/settings")
    return { ok: true, message: "Test message delivered." }
  } catch {
    return { ok: false, message: "Slack rejected the webhook URL." }
  }
}

/**
 * n8n administration — single instance config plus a live connection probe.
 *
 * @spec L2-N8N-02, L2-N8N-03
 */

/**
 * Upsert the single `n8n_config` row. The base URL is normalized to an origin
 * (+ any sub-path); a blank key field keeps the stored key. `settings`-gated.
 */
export async function saveN8nConfig(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const rawUrl = String(formData.get("baseUrl") ?? "").trim()
  const baseUrl = rawUrl ? normalizeN8nBaseUrl(rawUrl) : null
  if (rawUrl && !baseUrl) {
    return {
      ok: false,
      message: "Enter the instance URL, e.g. https://n8n.example.com.",
    }
  }

  const set: Record<string, unknown> = {
    kind: "n8n",
    baseUrl,
    enabled: formData.get("enabled") != null,
    updatedAt: new Date(),
  }
  const apiKey = String(formData.get("apiKey") ?? "")
  if (apiKey) set.apiKeyEnc = encryptSecret(apiKey)

  await db
    .insert(n8nConfig)
    .values(set as typeof n8nConfig.$inferInsert)
    .onConflictDoUpdate({ target: n8nConfig.kind, set })

  revalidatePath("/backflip/settings")
  return { ok: true, message: "Saved." }
}

/**
 * Probe the n8n public API with the stored key (decrypted server-side only).
 * Read-only — it lists at most one workflow and executes nothing.
 */
export async function testN8nConnection(): Promise<SaveState> {
  const session = await auth()
  if (!session?.user || !canAccessSettings(session.user.role)) {
    return { ok: false, message: "Unauthorized" }
  }

  const row = await db.query.n8nConfig.findFirst({
    where: eq(n8nConfig.kind, "n8n"),
  })
  if (!row?.baseUrl)
    return { ok: false, message: "Save an instance URL first." }
  if (!row.apiKeyEnc) return { ok: false, message: "Save an API key first." }

  try {
    const status = await fetchN8nStatus(
      row.baseUrl,
      decryptSecret(row.apiKeyEnc)
    )
    return {
      ok: true,
      message: status.hasWorkflows
        ? "Connected — the API key can read workflows."
        : "Connected — no workflows on this instance yet.",
    }
  } catch {
    return {
      ok: false,
      message: "Could not reach n8n — check the URL and API key.",
    }
  }
}
