import {
  aiConfig,
  analyticsConfig,
  clickupConfig,
  db,
  emailConfig,
  n8nConfig,
  slackApps,
  slackWebhooks,
  speechConfig,
} from "@workspace/db"
import { asc, eq } from "drizzle-orm"

import { requireCapability } from "@/app/_lib/auth/guard"
import { listClients } from "@/app/_lib/oauth/clients"
import { getConnectorSettings } from "@/app/_lib/oauth/connector-config"
import {
  isMcpEnabled,
  isMcpForcedOff,
  mcpResourceUrl,
} from "@/app/_lib/oauth/config"
import { type ProviderConfig } from "./_components/ai-config-form"
import { type AnalyticsConfig } from "./_components/analytics-integration"
import { type ClickupConfig } from "./_components/clickup-integration"
import {
  type ConnectorClientRow,
  type ConnectorSettingsData,
} from "./_components/connectors-integration"
import { type EmailConfig } from "./_components/email-config-form"
import { IntegrationsView } from "./_components/integrations-view"
import { type N8nConfig } from "./_components/n8n-integration"
import { type SlackAppRow } from "./_components/slack-apps"
import { type SlackWebhookRow } from "./_components/slack-webhooks"
import { type SpeechConfig } from "./_components/speech-integration"
import { keyPreview, urlPreview } from "./_lib/mask"
import type { Metadata } from "next"
import { titleFor } from "../../_lib/crumbs"

export const metadata: Metadata = { title: titleFor("/backflip/settings") }

const PROVIDERS = ["anthropic", "openai", "google"] as const

const CONNECTOR_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
})

/**
 * /backflip/settings — admin Integrations (owner only). Master-detail over
 * eight surfaces: AI providers (per provider), Email (Resend), Google
 * Analytics, Speech (Deepgram), the Connectors (MCP OAuth client) admin,
 * ClickUp, Slack (many apps + many webhooks) and n8n. Secrets are never sent
 * to the client; only whether a key is set + its masked preview (or, for a
 * freshly created OAuth client, the raw secret exactly once — `L2-MCP-50`).
 * The GA measurement id is public, so it round-trips in the clear.
 *
 * @spec L2-AI-01, L2-EMAIL-01, L2-ANALYTICS-05, L2-SPEECH-01, L2-MCP-25,
 *       L2-MCP-37, L2-MCP-47, L2-CLICKUP-01, L2-SLACK-01, L2-SLACK-02,
 *       L2-N8N-01
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

  const [speechRow] = await db
    .select()
    .from(speechConfig)
    .where(eq(speechConfig.provider, "deepgram"))
  const speech: SpeechConfig = {
    sttModel: speechRow?.sttModel ?? "",
    ttsModel: speechRow?.ttsModel ?? "",
    enabled: speechRow?.enabled ?? false,
    keyPreview: keyPreview(speechRow?.apiKeyEnc),
  }

  // The connector tab always renders — it explains itself when off, and the
  // enable switch (`ConnectorEnable`) is how an owner turns it on in the
  // first place. Settings are read unconditionally (cheap: a single row,
  // created with defaults on first use); the management sections' data
  // (clients) is only fetched once the connector is actually reachable —
  // `enabled` resolved through `isMcpEnabled()`, which folds in the
  // `MCP_ENABLED=false` kill switch (`L2-MCP-25`, `L2-MCP-37`).
  const [connectorsEnabled, connectorSettingsRow] = await Promise.all([
    isMcpEnabled(),
    getConnectorSettings(),
  ])
  const connectorSettings: ConnectorSettingsData = {
    enabled: connectorSettingsRow.enabled,
    forcedOff: isMcpForcedOff(),
    dcrMode: connectorSettingsRow.dcrMode,
    redirectHosts: connectorSettingsRow.redirectHosts,
  }
  const [clickupRow] = await db
    .select()
    .from(clickupConfig)
    .where(eq(clickupConfig.kind, "clickup"))
  const clickup: ClickupConfig = {
    teamId: clickupRow?.teamId ?? "",
    enabled: clickupRow?.enabled ?? false,
    tokenPreview: keyPreview(clickupRow?.apiTokenEnc),
  }

  const [n8nRow] = await db
    .select()
    .from(n8nConfig)
    .where(eq(n8nConfig.kind, "n8n"))
  const n8n: N8nConfig = {
    baseUrl: n8nRow?.baseUrl ?? "",
    enabled: n8nRow?.enabled ?? false,
    keyPreview: keyPreview(n8nRow?.apiKeyEnc),
  }

  // Slack is the one multi-row integration here: any number of apps (bot
  // tokens) and any number of incoming webhooks. Secrets stay server-side —
  // rows carry masked previews only.
  const [slackAppRows, slackWebhookRows] = await Promise.all([
    db.select().from(slackApps).orderBy(asc(slackApps.createdAt)),
    db.select().from(slackWebhooks).orderBy(asc(slackWebhooks.createdAt)),
  ])
  const slackAppList: SlackAppRow[] = slackAppRows.map((row) => ({
    id: row.id,
    name: row.name,
    defaultChannel: row.defaultChannel,
    teamName: row.teamName,
    appId: row.appId,
    enabled: row.enabled,
    tokenPreview: keyPreview(row.botTokenEnc),
    hasSigningSecret: Boolean(row.signingSecretEnc),
    lastCheckedAt: row.lastCheckedAt
      ? CONNECTOR_DATE_FMT.format(row.lastCheckedAt)
      : null,
  }))
  const slackWebhookList: SlackWebhookRow[] = slackWebhookRows.map((row) => ({
    id: row.id,
    label: row.label,
    channel: row.channel,
    enabled: row.enabled,
    urlPreview: urlPreview(row.urlEnc),
    lastCheckedAt: row.lastCheckedAt
      ? CONNECTOR_DATE_FMT.format(row.lastCheckedAt)
      : null,
  }))

  let connectorClients: ConnectorClientRow[] = []
  if (connectorsEnabled) {
    const clientRows = await listClients()
    connectorClients = clientRows.map((c) => ({
      id: c.id,
      clientId: c.clientId,
      clientName: c.clientName,
      origin: c.origin,
      redirectUris: c.redirectUris,
      allowLoopbackPorts: c.allowLoopbackPorts,
      createdAt: CONNECTOR_DATE_FMT.format(c.createdAt),
      lastUsedAt: c.lastUsedAt ? CONNECTOR_DATE_FMT.format(c.lastUsedAt) : null,
    }))
  }

  return (
    <IntegrationsView
      ai={ai}
      email={email}
      analytics={analytics}
      speech={speech}
      connectorsEnabled={connectorsEnabled}
      connectorSettings={connectorSettings}
      connectorClients={connectorClients}
      connectorMcpUrl={mcpResourceUrl()}
      clickup={clickup}
      slackApps={slackAppList}
      slackWebhooks={slackWebhookList}
      n8n={n8n}
    />
  )
}
