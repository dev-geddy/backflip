"use client"

import { useActionState, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { NativeSelect } from "@workspace/ui/components/native-select"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"
import { RiFlaskLine, RiRefreshLine } from "@remixicon/react"

import { saveAiConfig } from "../_actions"
import { useProviderModels } from "../_hooks/use-provider-models"
import { SectionLabel } from "../../_components/page-heading"
import { LABEL, PACKAGE, type ProviderConfig } from "./ai-config-form"
import { AiTestDialog } from "./ai-test-dialog"
import { CredentialField } from "./credential-field"

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
  const [testOpen, setTestOpen] = useState(false)
  const cfg = providers.find((p) => p.provider === active) ?? providers[0]
  const canTest = providers.some((p) => p.enabled && p.keyPreview)
  if (!cfg) return null

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">AI providers</h2>
          <p className="text-sm text-muted-foreground">
            Connect model providers. Keys are encrypted at rest.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canTest}
          onClick={() => setTestOpen(true)}
          title={
            canTest
              ? undefined
              : "Enable a provider with a saved API key to run a test."
          }
        >
          <RiFlaskLine />
          Test integration
        </Button>
      </div>

      <AiTestDialog
        providers={providers}
        open={testOpen}
        onOpenChange={setTestOpen}
      />

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
  const { models, live, liveCount, loading, error, reload } =
    useProviderModels(cfg)
  const hasKey = Boolean(cfg.keyPreview)
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
          <CredentialField
            id={`key-${cfg.provider}`}
            name="apiKey"
            label="API key"
            preview={cfg.keyPreview}
            placeholder="Paste API key"
            target={`ai:${cfg.provider}`}
            serviceName={LABEL[cfg.provider]}
            removalNote="it stops serving models and loses its default flag"
          />

          <Field>
            <FieldLabel htmlFor={`model-${cfg.provider}`}>
              Default model
            </FieldLabel>
            <NativeSelect
              id={`model-${cfg.provider}`}
              name="model"
              defaultValue={cfg.model}
              disabled={loading || !hasKey || models.length === 0}
            >
              <option value="">
                {!hasKey
                  ? "Save an API key to load models…"
                  : loading
                    ? "Loading models…"
                    : models.length === 0
                      ? "No models to choose from"
                      : "Select a model…"}
              </option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label === m.id ? m.id : `${m.label} — ${m.id}`}
                </option>
              ))}
            </NativeSelect>
            {/* Every id in the list comes from the provider (plus the one
                already saved). Nothing is suggested from a built-in list. */}
            {!hasKey ? (
              <FieldDescription>
                The provider lists its own models once a key is saved.
              </FieldDescription>
            ) : error ? (
              <FieldDescription className="text-destructive">
                {error}
              </FieldDescription>
            ) : null}
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

      {/* Available models — the provider's own list, or a plain statement of
          why there isn't one. Never a built-in catalog dressed up as live. */}
      {hasKey ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionLabel>Available models</SectionLabel>
            <span className="text-[11px] text-muted-foreground">
              {loading
                ? "fetching from provider…"
                : live
                  ? `live from the ${LABEL[cfg.provider]} API · ${liveCount} ${
                      liveCount === 1 ? "model" : "models"
                    }`
                  : "provider list unavailable"}
            </span>
            {!loading ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={reload}
              >
                <RiRefreshLine className="size-3.5" />
                Refresh
              </Button>
            ) : null}
          </div>
          {loading ? (
            <div className="rounded-lg border px-3 py-6 text-center text-xs text-muted-foreground">
              Asking the provider…
            </div>
          ) : live ? (
            <div className="max-h-72 divide-y overflow-y-auto rounded-lg border">
              {models.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs">{m.id}</span>
                    {m.label !== m.id ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {m.label}
                      </span>
                    ) : null}
                  </div>
                  {m.id === cfg.model ? <GreenBadge>Default</GreenBadge> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed px-3 py-6 text-center">
              {/* The reason itself is already on the field above; this says
                  why the space is empty rather than filled with guesses. */}
              <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                Only the provider can say which models this key may use, so
                nothing is listed until it answers.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
