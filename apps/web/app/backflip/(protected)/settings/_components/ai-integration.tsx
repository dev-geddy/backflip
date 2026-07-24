"use client"

import { useState } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import { SectionLabel } from "../../_components/page-heading"
import {
  LABEL,
  MODELS,
  ProviderForm,
  type ProviderConfig,
} from "./ai-config-form"

function GreenBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
      {children}
    </span>
  )
}

/**
 * AI-providers integration detail (design 2a): a status-dot tab per provider,
 * the selected provider's credentials/model form (reused `ProviderForm` →
 * `saveAiConfig`), and a read-only list of available models. Keys stay masked
 * (no Reveal). `key` on `ProviderForm` resets its action state per provider.
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

      {/* Status line */}
      <div className="flex flex-wrap items-center gap-2">
        {cfg.isDefault ? <GreenBadge>Default provider</GreenBadge> : null}
        <Badge variant={cfg.enabled ? "secondary" : "outline"}>
          {cfg.enabled ? "Enabled" : "Disabled"}
        </Badge>
        {!cfg.keyPreview ? (
          <span className="text-xs text-muted-foreground">No key set</span>
        ) : null}
      </div>

      {/* Credentials + model + toggles (reused form → saveAiConfig) */}
      <ProviderForm key={cfg.provider} cfg={cfg} />

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
