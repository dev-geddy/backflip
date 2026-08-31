"use client"

import { useActionState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

import { saveN8nConfig, testN8nConnection } from "../_actions"
import { IntegrationTestButton } from "./integration-test-button"

/** View model for the n8n pane — never carries the key itself. */
export type N8nConfig = {
  baseUrl: string
  enabled: boolean
  keyPreview: string | null
}

/**
 * n8n integration detail — single-instance pane: instance URL, public API key,
 * Enabled toggle, plus a read-only connection probe.
 *
 * @spec L2-N8N-04
 */
export function N8nIntegration({
  n8n,
  connected,
}: {
  n8n: N8nConfig
  connected: boolean
}) {
  const [state, action, pending] = useActionState(saveN8nConfig, null)

  return (
    <div className="p-5">
      <form action={action} className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex size-11 flex-none items-center justify-center rounded-xl border bg-muted font-mono text-sm font-semibold">
            n8
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">n8n</span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                n8n
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
              Workflow automation
            </div>
          </div>
          <label className="flex flex-none items-center gap-2">
            <span className="text-xs text-muted-foreground">Enabled</span>
            <Switch name="enabled" defaultChecked={n8n.enabled} />
          </label>
        </div>

        <div className="h-px bg-border" />

        {/* Instance */}
        <div>
          <div className="text-[13px] font-semibold">Instance</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            One n8n instance — self-hosted or cloud. Keys are encrypted at rest
            and never exposed to the client.
          </div>
        </div>

        <div className="flex max-w-xl flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="n8n-url">Instance URL</FieldLabel>
            <Input
              id="n8n-url"
              name="baseUrl"
              type="url"
              autoComplete="off"
              className="font-mono"
              placeholder="https://n8n.example.com"
              defaultValue={n8n.baseUrl}
            />
            <FieldDescription>
              Origin only — the API path (
              <span className="font-mono">/api/v1</span>) is added for you.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="n8n-key">Public API key</FieldLabel>
            {/* type="text" + CSS masking, NOT type="password" — see the Resend
                pane for why. */}
            <Input
              id="n8n-key"
              name="apiKey"
              type="text"
              autoComplete="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              className="[-webkit-text-security:disc]"
              placeholder={
                n8n.keyPreview
                  ? `${n8n.keyPreview} — leave blank to keep`
                  : "n8n_api_…"
              }
            />
            <FieldDescription>
              n8n → Settings → n8n API → Create an API key. Sent as{" "}
              <span className="font-mono">X-N8N-API-KEY</span>.
            </FieldDescription>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          <IntegrationTestButton
            action={testN8nConnection}
            disabled={!n8n.keyPreview || !n8n.baseUrl}
          />
          {state && !state.ok ? (
            <span className="text-sm text-destructive">{state.message}</span>
          ) : null}
        </div>
      </form>
    </div>
  )
}
