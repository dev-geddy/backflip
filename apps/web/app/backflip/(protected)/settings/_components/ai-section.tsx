"use client"

import { useState } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"

import { AiConfigForm, LABEL, type ProviderConfig } from "./ai-config-form"

export function AiSection({ initial }: { initial: ProviderConfig[] }) {
  const [editing, setEditing] = useState(false)
  const configured = initial.filter((c) => c.keyPreview).length

  if (editing) {
    return (
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <div className="w-full md:max-w-md">
          <AiConfigForm
            initial={initial}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
        <Separator orientation="vertical" className="hidden md:block" />
        <div className="w-full space-y-3 text-sm text-muted-foreground md:max-w-xs">
          <p>
            Configure providers for the AI SDK, then pick one default. The app
            calls the default provider unless overridden.
          </p>
          <p>
            API keys are encrypted at rest and never sent to the browser. Leave
            the key field blank to keep the current key.
          </p>
          <p>Only one provider can be the default at a time.</p>
          <p>
            The model chosen here is the provider&rsquo;s default. Individual AI
            features may request a different model at call time.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        {configured > 0 ? (
          <Badge variant="secondary">
            {configured} of {initial.length} providers configured
          </Badge>
        ) : (
          <Badge variant="outline">Not configured</Badge>
        )}
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit settings
        </Button>
      </div>

      <dl className="flex flex-col divide-y">
        {initial.map((c) => (
          <div
            key={c.provider}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm"
          >
            <dt className="flex items-center gap-2">
              <span className="font-medium">{LABEL[c.provider]}</span>
              {c.isDefault ? <Badge variant="secondary">Default</Badge> : null}
              {c.enabled ? <Badge variant="outline">Enabled</Badge> : null}
            </dt>
            <dd className="text-muted-foreground">
              {c.keyPreview ? (
                <span className="font-mono">
                  {c.model || "no model"} · {c.keyPreview}
                </span>
              ) : (
                <span>Not configured</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
