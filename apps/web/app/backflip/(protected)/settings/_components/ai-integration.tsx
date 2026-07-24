"use client"

import { useActionState, useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { NativeSelect } from "@workspace/ui/components/native-select"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

import { saveAiConfig } from "../_actions"
import { SectionLabel } from "../../_components/page-heading"
import { LABEL, MODELS, PACKAGE, type ProviderConfig } from "./ai-config-form"

function GreenBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
      {children}
    </span>
  )
}

/**
 * AI-providers integration detail (design 2a): a status-dot tab per provider,
 * then the selected provider's pane — a header (logo tile · package badge ·
 * status · Enabled toggle) over the credentials/model form + available models.
 * Keys stay masked (no Reveal). Save via reused `saveAiConfig`.
 */
export function AiIntegration({ providers }: { providers: ProviderConfig[] }) {
  const [active, setActive] = useState<ProviderConfig["provider"]>(
    providers[0]?.provider ?? "anthropic"
  )
  const cfg = providers.find((p) => p.provider === active) ?? providers[0]
  if (!cfg) return null

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">AI providers</h2>
        <p className="text-sm text-muted-foreground">
          Connect model providers. Keys are encrypted at rest.
        </p>
      </div>

      {/* Provider tabs */}
      <div className="flex gap-1 border-b">
        {providers.map((p) => {
          const on = p.provider === active
          const dot = p.enabled
            ? "bg-emerald-500"
            : p.keyPreview
              ? "bg-amber-500"
              : "bg-muted-foreground/30"
          return (
            <button
              key={p.provider}
              type="button"
              onClick={() => setActive(p.provider)}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors",
                on
                  ? "border-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn("size-1.5 rounded-full", dot)} />
              {LABEL[p.provider]}
            </button>
          )
        })}
      </div>

      <ProviderPane key={cfg.provider} cfg={cfg} />
    </div>
  )
}

function ProviderPane({ cfg }: { cfg: ProviderConfig }) {
  const [state, action, pending] = useActionState(saveAiConfig, null)
  const letter = cfg.provider.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="provider" value={cfg.provider} />

        {/* Header: logo · name · package · status · Enabled toggle */}
        <div className="flex items-center gap-3">
          <div className="flex size-11 flex-none items-center justify-center rounded-xl border bg-muted font-mono text-base font-semibold">
            {letter}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">
                {LABEL[cfg.provider]}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {PACKAGE[cfg.provider]}
              </span>
              {cfg.isDefault ? <GreenBadge>Default</GreenBadge> : null}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  cfg.enabled
                    ? "bg-emerald-500"
                    : cfg.keyPreview
                      ? "bg-amber-500"
                      : "bg-muted-foreground/30"
                )}
              />
              {cfg.keyPreview ? "Connected" : "Not connected"}
            </div>
          </div>
          <label className="flex flex-none items-center gap-2">
            <span className="text-xs text-muted-foreground">Enabled</span>
            <Switch name="enabled" defaultChecked={cfg.enabled} />
          </label>
        </div>

        <div className="h-px bg-border" />

        {/* Credentials + model */}
        <div className="flex max-w-md flex-col gap-4">
          <Field>
            <FieldLabel htmlFor={`key-${cfg.provider}`}>API key</FieldLabel>
            <Input
              id={`key-${cfg.provider}`}
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder={
                cfg.keyPreview
                  ? `${cfg.keyPreview} — leave blank to keep`
                  : "Paste API key"
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={`model-${cfg.provider}`}>
              Default model
            </FieldLabel>
            <NativeSelect
              id={`model-${cfg.provider}`}
              name="model"
              defaultValue={cfg.model}
            >
              <option value="">Select a model…</option>
              {MODELS[cfg.provider].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <label className="flex items-center gap-3">
            <Switch name="isDefault" defaultChecked={cfg.isDefault} />
            <span className="text-sm">Set as default provider</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          {state && !state.ok ? (
            <span className="text-sm text-destructive">{state.message}</span>
          ) : null}
        </div>
      </form>

      {/* Available models */}
      <div className="flex flex-col gap-3">
        <SectionLabel>Available models</SectionLabel>
        <div className="divide-y rounded-lg border">
          {MODELS[cfg.provider].map((m) => (
            <div
              key={m}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <span className="font-mono text-xs">{m}</span>
              {m === cfg.model ? <GreenBadge>Default</GreenBadge> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
