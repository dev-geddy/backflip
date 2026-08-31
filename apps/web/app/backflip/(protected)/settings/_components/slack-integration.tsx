"use client"

import { cn } from "@workspace/ui/lib/utils"

import { SlackApps, type SlackAppRow } from "./slack-apps"
import { SlackWebhooks, type SlackWebhookRow } from "./slack-webhooks"

/**
 * Slack integration detail — a list pane, not a form: many apps (bot tokens)
 * and many incoming webhooks, each row managed on its own. There is no single
 * "Slack config" to save, so the header carries status only.
 *
 * @spec L2-SLACK-08
 */
export function SlackIntegration({
  apps,
  webhooks,
}: {
  apps: SlackAppRow[]
  webhooks: SlackWebhookRow[]
}) {
  const activeApps = apps.filter((a) => a.enabled && a.tokenPreview).length
  const activeWebhooks = webhooks.filter((w) => w.enabled).length
  const connected = activeApps > 0 || activeWebhooks > 0

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-11 flex-none items-center justify-center rounded-xl border bg-muted font-mono text-sm font-semibold">
          Sl
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Slack</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              slack
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "size-1.5 rounded-full",
                connected ? "bg-emerald-500" : "bg-muted-foreground/30"
              )}
            />
            {connected ? "Connected" : "Not connected"}
            <span className="text-muted-foreground/50">·</span>
            {apps.length} app{apps.length === 1 ? "" : "s"} · {webhooks.length}{" "}
            webhook{webhooks.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      <p className="max-w-xl text-xs text-muted-foreground">
        Two ways in: a <span className="font-medium">bot token</span> can post
        anywhere its app is invited and read what its scopes allow; an{" "}
        <span className="font-medium">incoming webhook</span> is a single
        post-only URL bound to one channel. Both are encrypted at rest and never
        sent back to the browser.
      </p>

      <SlackApps apps={apps} />

      <div className="h-px bg-border" />

      <SlackWebhooks webhooks={webhooks} />
    </div>
  )
}
