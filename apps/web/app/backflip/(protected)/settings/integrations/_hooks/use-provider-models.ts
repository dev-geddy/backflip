"use client"

import { useCallback, useEffect, useState } from "react"

import { listAiModels } from "../_actions"
import { type ProviderConfig } from "../_components/ai-config-form"

export type ModelOption = { id: string; label: string }

export type ProviderModelsState = {
  /** Live ids from the provider, plus the saved model if it is not among them. */
  models: ModelOption[]
  loading: boolean
  /** Why the live list is missing, ready to show. Null while it is fine. */
  error: string | null
  /** True once the provider's models API has answered. */
  live: boolean
  /** How many ids the provider itself returned — never counts the saved one. */
  liveCount: number
  reload: () => void
}

/**
 * The provider's own model list, fetched through `listAiModels` with the
 * stored key (decrypted server-side).
 *
 * **Live ids only.** There is no static catalog behind this: a hardcoded list
 * of model names goes stale the week a provider ships a model, and an operator
 * cannot tell a guess from a fact once both render in the same select. No key,
 * a failed call or an empty answer therefore yields no models and a sentence
 * saying why — never a plausible-looking list.
 *
 * The one id shown without the provider vouching for it is the model already
 * saved in this config: that one is a stored fact about the deployment, and
 * dropping it from the select would silently re-point a working integration on
 * the next save. It is marked as saved where it renders.
 *
 * Shared by the provider pane and the test modal.
 *
 * @spec L2-AI-13, L2-AI-24
 */
export function useProviderModels(cfg: ProviderConfig): ProviderModelsState {
  const [models, setModels] = useState<ModelOption[]>([])
  const [live, setLive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(cfg.keyPreview))
  const [attempt, setAttempt] = useState(0)

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    // No key: nothing to ask and nothing to show. The render path below
    // ignores any stale state rather than resetting it here, which would cost
    // a second render on every provider switch.
    if (!cfg.keyPreview) return
    let cancelled = false
    setLoading(true)
    listAiModels(cfg.provider)
      .then((res) => {
        if (cancelled) return
        if (res.ok) {
          setModels(res.models)
          setLive(true)
          setError(null)
        } else {
          setModels([])
          setLive(false)
          setError(res.message)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModels([])
          setLive(false)
          setError("Could not reach the provider.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [cfg.provider, cfg.keyPreview, attempt])

  const hasKey = Boolean(cfg.keyPreview)
  const fetched = hasKey ? models : []
  const state: ProviderModelsState = {
    models: fetched,
    live: hasKey && live,
    liveCount: fetched.length,
    loading: hasKey && loading,
    error: hasKey ? error : null,
    reload,
  }

  // The saved model stays selectable even when the live list omits it.
  if (cfg.model && !fetched.some((m) => m.id === cfg.model)) {
    return {
      ...state,
      models: [{ id: cfg.model, label: `${cfg.model} (saved)` }, ...fetched],
    }
  }
  return state
}
