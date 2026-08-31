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

import { saveClickupConfig, testClickupConnection } from "../_actions"
import { IntegrationTestButton } from "./integration-test-button"

/** View model for the ClickUp pane — never carries the token itself. */
export type ClickupConfig = {
  teamId: string
  enabled: boolean
  tokenPreview: string | null
}

/**
 * ClickUp integration detail — single-config pane: personal API token, default
 * workspace id, Enabled toggle, plus a read-only connection probe.
 *
 * @spec L2-CLICKUP-04
 */
export function ClickupIntegration({
  clickup,
  connected,
}: {
  clickup: ClickupConfig
  connected: boolean
}) {
  const [state, action, pending] = useActionState(saveClickupConfig, null)

  return (
    <div className="p-5">
      <form action={action} className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex size-11 flex-none items-center justify-center rounded-xl border bg-muted font-mono text-sm font-semibold">
            Cu
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">ClickUp</span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                clickup
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
              Tasks &amp; workspaces
            </div>
          </div>
          <label className="flex flex-none items-center gap-2">
            <span className="text-xs text-muted-foreground">Enabled</span>
            <Switch name="enabled" defaultChecked={clickup.enabled} />
          </label>
        </div>

        <div className="h-px bg-border" />

        {/* Credentials */}
        <div>
          <div className="text-[13px] font-semibold">Credentials</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Tokens are encrypted at rest and never exposed to the client.
          </div>
        </div>

        <div className="flex max-w-xl flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="clickup-token">Personal API token</FieldLabel>
            {/* type="text" + CSS masking, NOT type="password": a password input
                makes Chrome treat the form as a login form and prefill saved
                admin credentials into it. */}
            <Input
              id="clickup-token"
              name="apiToken"
              type="text"
              autoComplete="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              className="[-webkit-text-security:disc]"
              placeholder={
                clickup.tokenPreview
                  ? `${clickup.tokenPreview} — leave blank to keep`
                  : "pk_…"
              }
            />
            <FieldDescription>
              ClickUp → Settings → Apps → Generate. A workspace-scoped OAuth app
              is not wired up yet.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="clickup-team">
              Default workspace ID{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id="clickup-team"
              name="teamId"
              autoComplete="off"
              className="font-mono"
              placeholder="9012345678"
              defaultValue={clickup.teamId}
            />
            <FieldDescription>
              The numeric team id from a ClickUp URL — app.clickup.com/
              <span className="font-mono">9012345678</span>/…
            </FieldDescription>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          <IntegrationTestButton
            action={testClickupConnection}
            disabled={!clickup.tokenPreview}
          />
          {state && !state.ok ? (
            <span className="text-sm text-destructive">{state.message}</span>
          ) : null}
        </div>
      </form>
    </div>
  )
}
