"use client"

import { useActionState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"

import { saveEmailConfig } from "../_actions"

export type EmailConfig = {
  fromEmail: string
  fromName: string
  replyTo: string
  enabled: boolean
  hasKey: boolean
}

export function EmailConfigForm({ initial }: { initial: EmailConfig }) {
  const [state, action, pending] = useActionState(saveEmailConfig, null)

  return (
    <form action={action} className="flex max-w-80 flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="resend-key">API key</FieldLabel>
        <Input
          id="resend-key"
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={
            initial.hasKey ? "•••••••• set — leave blank to keep" : "re_…"
          }
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="resend-from-email">From email</FieldLabel>
        <Input
          id="resend-from-email"
          name="fromEmail"
          type="email"
          autoComplete="off"
          placeholder="no-reply@example.com"
          defaultValue={initial.fromEmail}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="resend-from-name">From name</FieldLabel>
        <Input
          id="resend-from-name"
          name="fromName"
          autoComplete="off"
          placeholder="Backflip"
          defaultValue={initial.fromName}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="resend-reply-to">Reply-to</FieldLabel>
        <Input
          id="resend-reply-to"
          name="replyTo"
          type="email"
          autoComplete="off"
          placeholder="support@example.com"
          defaultValue={initial.replyTo}
        />
      </Field>

      <div className="flex items-center gap-3">
        <Switch
          id="resend-enabled"
          name="enabled"
          defaultChecked={initial.enabled}
        />
        <FieldLabel htmlFor="resend-enabled">Enabled</FieldLabel>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state ? (
          <span className="text-sm text-muted-foreground">{state.message}</span>
        ) : null}
      </div>
    </form>
  )
}
