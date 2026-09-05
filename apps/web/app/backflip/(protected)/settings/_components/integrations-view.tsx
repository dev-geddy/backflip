"use client"

import { useState } from "react"

import { cn } from "@workspace/ui/lib/utils"
import { RiArrowLeftLine } from "@remixicon/react"

import {
  integrationQuery,
  type AiProviderId,
  type IntegrationId,
} from "../_lib/deep-link"
import { AiIntegration } from "./ai-integration"
import type { ProviderConfig } from "./ai-config-form"
import {
  AnalyticsIntegration,
  type AnalyticsConfig,
} from "./analytics-integration"
import { ClickupIntegration, type ClickupConfig } from "./clickup-integration"
import {
  ConnectorsIntegration,
  type ConnectorClientRow,
  type ConnectorSettingsData,
} from "./connectors-integration"
import type { EmailConfig } from "./email-config-form"
import { EmailIntegration } from "./email-integration"
import { IntegrationsRail } from "./integrations-rail"
import { N8nIntegration, type N8nConfig } from "./n8n-integration"
import { SlackIntegration } from "./slack-integration"
import type { SlackAppRow } from "./slack-apps"
import type { SlackWebhookRow } from "./slack-webhooks"
import { SpeechIntegration, type SpeechConfig } from "./speech-integration"

/** The pane ids live in `_lib/deep-link.ts` — they are also the URL values. */
type Selection = IntegrationId

/** One row in the integrations master list. */
function ListRow({
  active,
  tile,
  title,
  subtitle,
  connected,
  onClick,
}: {
  active: boolean
  tile: React.ReactNode
  title: string
  subtitle: string
  connected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors",
        active
          ? "border-primary bg-muted"
          : "border-transparent hover:bg-muted/50"
      )}
    >
      {tile}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <span
        className={cn(
          "size-1.5 flex-none rounded-full",
          connected ? "bg-emerald-500" : "bg-muted-foreground/30"
        )}
      />
    </button>
  )
}

/**
 * Integrations admin shell (design 2a) — master list of connected services +
 * detail pane + context rail. **Real-data-only:** every row below is backed by
 * stored config — AI providers, Resend email, Google Analytics, Deepgram
 * speech, the MCP connector, ClickUp, Slack (apps + webhooks) and n8n.
 */
export function IntegrationsView({
  ai,
  email,
  analytics,
  speech,
  connectorsEnabled,
  connectorSettings,
  connectorClients,
  connectorMcpUrl,
  clickup,
  slackApps,
  slackWebhooks,
  n8n,
  initialSelection,
  initialProvider,
}: {
  ai: ProviderConfig[]
  email: EmailConfig
  analytics: AnalyticsConfig
  speech: SpeechConfig
  connectorsEnabled: boolean
  connectorSettings: ConnectorSettingsData | null
  connectorClients: ConnectorClientRow[]
  connectorMcpUrl: string
  clickup: ClickupConfig
  slackApps: SlackAppRow[]
  slackWebhooks: SlackWebhookRow[]
  n8n: N8nConfig
  /** Pane to open, resolved from the query string server-side (`L2-UI-59`). */
  initialSelection: Selection
  initialProvider: AiProviderId
}) {
  const [selection, setSelection] = useState<Selection>(initialSelection)
  const [mobileDetail, setMobileDetail] = useState(false)

  const aiConnected = ai.filter((c) => c.keyPreview).length
  const emailConnected = Boolean(email.keyPreview)
  const analyticsConnected = Boolean(analytics.measurementId)
  const speechConnected = Boolean(speech.keyPreview)
  const clickupConnected = Boolean(clickup.tokenPreview)
  const slackCount = slackApps.length + slackWebhooks.length
  const slackConnected = slackCount > 0
  const n8nConnected = Boolean(n8n.keyPreview && n8n.baseUrl)

  function select(s: Selection) {
    setSelection(s)
    setMobileDetail(true)
    // `replaceState`, not a router navigation: the pane is already rendered
    // client-side, and a `router.replace` would re-run the whole server
    // component (every config read) to change one attribute. Replace rather
    // than push so browsing the list does not bury the page the operator
    // arrived from under eight history entries.
    window.history.replaceState(null, "", integrationQuery(s))
  }

  return (
    <div className="flex h-full min-h-0 bg-card">
      {/* List — on the header canvas, not the card */}
      <div
        className={cn(
          "min-h-0 w-full flex-col overflow-hidden bg-background lg:flex lg:w-[372px] lg:flex-none lg:border-r",
          mobileDetail ? "hidden" : "flex"
        )}
      >
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-sm font-semibold">Integrations</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ListRow
            active={selection === "ai"}
            onClick={() => select("ai")}
            connected={aiConnected > 0}
            tile={
              <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                AI
              </span>
            }
            title="AI providers"
            subtitle={
              aiConnected > 0
                ? `${aiConnected} of ${ai.length} connected`
                : "Not configured"
            }
          />
          <ListRow
            active={selection === "email"}
            onClick={() => select("email")}
            connected={emailConnected}
            tile={
              <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold">
                Re
              </span>
            }
            title="Email"
            subtitle="Resend · transactional email"
          />
          <ListRow
            active={selection === "analytics"}
            onClick={() => select("analytics")}
            connected={analyticsConnected}
            tile={
              <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold">
                GA
              </span>
            }
            title="Google Analytics"
            subtitle={
              analyticsConnected ? analytics.measurementId : "Not configured"
            }
          />
          <ListRow
            active={selection === "speech"}
            onClick={() => select("speech")}
            connected={speechConnected}
            tile={
              <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold">
                Dg
              </span>
            }
            title="Speech"
            subtitle="Deepgram · speech-to-text & TTS"
          />
          <ListRow
            active={selection === "connectors"}
            onClick={() => select("connectors")}
            connected={connectorsEnabled}
            tile={
              <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold">
                Cn
              </span>
            }
            title="MCP Connectors"
            subtitle={
              connectorsEnabled
                ? `${connectorClients.length} client${connectorClients.length === 1 ? "" : "s"}`
                : "Disabled"
            }
          />
          <ListRow
            active={selection === "clickup"}
            onClick={() => select("clickup")}
            connected={clickupConnected}
            tile={
              <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold">
                Cu
              </span>
            }
            title="ClickUp"
            subtitle={clickupConnected ? "Token saved" : "Not configured"}
          />
          <ListRow
            active={selection === "slack"}
            onClick={() => select("slack")}
            connected={slackConnected}
            tile={
              <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold">
                Sl
              </span>
            }
            title="Slack"
            subtitle={
              slackConnected
                ? `${slackApps.length} app${slackApps.length === 1 ? "" : "s"} · ${slackWebhooks.length} webhook${slackWebhooks.length === 1 ? "" : "s"}`
                : "Not configured"
            }
          />
          <ListRow
            active={selection === "n8n"}
            onClick={() => select("n8n")}
            connected={n8nConnected}
            tile={
              <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold">
                n8
              </span>
            }
            title="n8n"
            subtitle={n8nConnected ? n8n.baseUrl : "Not configured"}
          />
        </div>
      </div>

      {/* Detail — keeps the card surface */}
      <div
        className={cn(
          "min-h-0 flex-1 flex-col overflow-y-auto bg-card lg:flex",
          mobileDetail ? "flex" : "hidden"
        )}
      >
        <button
          type="button"
          onClick={() => setMobileDetail(false)}
          className="mx-5 mt-4 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground lg:hidden"
        >
          <RiArrowLeftLine className="size-4" />
          Integrations
        </button>
        {selection === "ai" ? (
          <AiIntegration providers={ai} initialProvider={initialProvider} />
        ) : selection === "email" ? (
          <EmailIntegration email={email} connected={emailConnected} />
        ) : selection === "analytics" ? (
          <AnalyticsIntegration
            analytics={analytics}
            connected={analyticsConnected}
          />
        ) : selection === "speech" ? (
          <SpeechIntegration speech={speech} connected={speechConnected} />
        ) : selection === "clickup" ? (
          <ClickupIntegration clickup={clickup} connected={clickupConnected} />
        ) : selection === "slack" ? (
          <SlackIntegration apps={slackApps} webhooks={slackWebhooks} />
        ) : selection === "n8n" ? (
          <N8nIntegration n8n={n8n} connected={n8nConnected} />
        ) : (
          <ConnectorsIntegration
            enabled={connectorsEnabled}
            settings={connectorSettings}
            clients={connectorClients}
            mcpUrl={connectorMcpUrl}
          />
        )}
      </div>

      {/* Rail */}
      <div className="hidden min-h-0 w-[300px] flex-none flex-col overflow-y-auto border-l bg-muted/50 p-4 xl:flex">
        <IntegrationsRail selection={selection} />
      </div>
    </div>
  )
}
