"use client"

import { useState } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"

import { EmailConfigForm, type EmailConfig } from "./email-config-form"

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm">
      <dt className="font-medium">{label}</dt>
      <dd className="text-muted-foreground">
        {value ? (
          <span className="font-mono">{value}</span>
        ) : (
          <span className="italic">not set</span>
        )}
      </dd>
    </div>
  )
}

export function EmailSection({ initial }: { initial: EmailConfig }) {
  const [editing, setEditing] = useState(false)
  const configured = Boolean(initial.keyPreview)

  if (editing) {
    return (
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <div className="w-full md:max-w-md">
          <EmailConfigForm
            initial={initial}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
        <Separator orientation="vertical" className="hidden md:block" />
        <div className="w-full space-y-3 text-sm text-muted-foreground md:max-w-xs">
          <p>Resend config for sending transactional email.</p>
          <p>
            The API key is encrypted at rest and never sent to the browser.
            Leave it blank to keep the current key.
          </p>
          <p>
            From email must be a verified sender on your Resend domain. Reply-to
            is optional.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        {configured ? (
          <Badge variant="secondary">
            Configured{initial.enabled ? " · enabled" : " · disabled"}
          </Badge>
        ) : (
          <Badge variant="outline">Not configured</Badge>
        )}
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit settings
        </Button>
      </div>

      {configured ? (
        <dl className="flex flex-col divide-y">
          <Row label="API key" value={initial.keyPreview} />
          <Row label="From email" value={initial.fromEmail || null} />
          <Row label="From name" value={initial.fromName || null} />
          <Row label="Reply-to" value={initial.replyTo || null} />
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          No Resend key set. Add one to send email.
        </p>
      )}
    </div>
  )
}
