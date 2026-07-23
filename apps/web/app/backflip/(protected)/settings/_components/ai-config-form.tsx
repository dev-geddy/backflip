"use client"

import { useActionState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { NativeSelect } from "@workspace/ui/components/native-select"
import { Switch } from "@workspace/ui/components/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import { saveAiConfig } from "../_actions"

export type ProviderConfig = {
  provider: "anthropic" | "openai" | "google"
  model: string
  enabled: boolean
  isDefault: boolean
  hasKey: boolean
}

const LABEL: Record<ProviderConfig["provider"], string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  google: "Google (Gemini)",
}

const MODELS: Record<ProviderConfig["provider"], string[]> = {
  anthropic: [
    "claude-opus-4-8",
    "claude-sonnet-5",
    "claude-haiku-4-5-20251001",
  ],
  openai: ["gpt-4.1", "gpt-4o", "o3", "o4-mini"],
  google: ["gemini-2.5-pro", "gemini-2.5-flash"],
}

function ProviderForm({ cfg }: { cfg: ProviderConfig }) {
  const [state, action, pending] = useActionState(saveAiConfig, null)

  return (
    <form action={action} className="flex max-w-80 flex-col gap-4">
      <input type="hidden" name="provider" value={cfg.provider} />

      <div className="text-sm font-medium">{LABEL[cfg.provider]}</div>

      <Field>
        <FieldLabel htmlFor={`model-${cfg.provider}`}>Default model</FieldLabel>
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

      <Field>
        <FieldLabel htmlFor={`key-${cfg.provider}`}>API key</FieldLabel>
        <Input
          id={`key-${cfg.provider}`}
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={
            cfg.hasKey ? "•••••••• set — leave blank to keep" : "Paste API key"
          }
        />
      </Field>

      <div className="flex items-center gap-3">
        <Switch
          id={`en-${cfg.provider}`}
          name="enabled"
          defaultChecked={cfg.enabled}
        />
        <FieldLabel htmlFor={`en-${cfg.provider}`}>Enabled</FieldLabel>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id={`def-${cfg.provider}`}
          name="isDefault"
          defaultChecked={cfg.isDefault}
        />
        <FieldLabel htmlFor={`def-${cfg.provider}`}>
          Default provider
        </FieldLabel>
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

export function AiConfigForm({ initial }: { initial: ProviderConfig[] }) {
  return (
    <Tabs defaultValue={initial[0]?.provider ?? "anthropic"}>
      <TabsList>
        {initial.map((c) => (
          <TabsTrigger key={c.provider} value={c.provider}>
            {LABEL[c.provider]}
          </TabsTrigger>
        ))}
      </TabsList>
      {initial.map((c) => (
        <TabsContent key={c.provider} value={c.provider} className="pt-4">
          <ProviderForm cfg={c} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
