"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiLockLine,
  RiRestartLine,
} from "@remixicon/react"

import { Button } from "@workspace/ui/components/button"

import { EMPTY_VARS, type SetupVars } from "./setup-vars"
import { LAST_STEP, STEPS, StepBody } from "./setup-steps"
import { WizardStepper } from "./wizard-stepper"

/** sessionStorage keys — stable, namespaced. Cleared when the tab closes. */
const VARS_KEY = "backflip.setup.vars"
const STEP_KEY = "backflip.setup.step"

/**
 * Everything except the owner password, which is deliberately memory-only: a
 * plaintext credential has no business surviving a reload.
 */
const PERSISTED: (keyof SetupVars)[] = [
  "host",
  "sshKey",
  "domain",
  "certbotEmail",
  "appName",
  "appPort",
  "adminEmail",
]

function persistable(vars: SetupVars) {
  const out: Record<string, string> = {}
  for (const key of PERSISTED) out[key] = vars[key]
  return out
}

/** Storage can throw (Safari private mode, disabled cookies) — never fatal. */
function readStored(key: string) {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // no-op: the guide still works, it just won't remember
  }
}

function clearStored() {
  try {
    window.sessionStorage.removeItem(VARS_KEY)
    window.sessionStorage.removeItem(STEP_KEY)
  } catch {
    // no-op
  }
}

/** Only known string keys are taken back out — storage is untrusted input. */
function restoreVars(): Partial<SetupVars> | null {
  const raw = readStored(VARS_KEY)
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== "object" || parsed === null) return null
  const record = parsed as Record<string, unknown>
  const restored: Partial<SetupVars> = {}
  for (const key of PERSISTED) {
    const value = record[key]
    if (typeof value === "string") restored[key] = value
  }
  return restored
}

function restoreStep(): number | null {
  const raw = readStored(STEP_KEY)
  if (raw === null) return null
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isInteger(parsed)) return null
  return Math.min(Math.max(parsed, 0), LAST_STEP)
}

/**
 * Client island for the whole guide: owns the operator's variables and the
 * wizard position, renders one step at a time with every command substituted.
 *
 * Variables and step index survive a reload via sessionStorage (same tab only);
 * the owner password never leaves memory. Storage is read in an effect, after a
 * stable first render, so the server and client markup always agree.
 */
export function SetupGuide() {
  const [vars, setVars] = useState<SetupVars>(EMPTY_VARS)
  const [step, setStep] = useState(0)
  const [restored, setRestored] = useState(false)
  const topRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const storedVars = restoreVars()
    if (storedVars) setVars((current) => ({ ...current, ...storedVars }))
    const storedStep = restoreStep()
    if (storedStep !== null) setStep(storedStep)
    setRestored(true)
  }, [])

  useEffect(() => {
    if (!restored) return
    writeStored(VARS_KEY, JSON.stringify(persistable(vars)))
  }, [restored, vars])

  useEffect(() => {
    if (!restored) return
    writeStored(STEP_KEY, String(step))
  }, [restored, step])

  const onChange = useCallback((key: keyof SetupVars, value: string) => {
    setVars((current) => ({ ...current, [key]: value }))
  }, [])

  const goTo = useCallback((index: number) => {
    setStep(Math.min(Math.max(index, 0), LAST_STEP))
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const reset = useCallback(() => {
    clearStored()
    setVars(EMPTY_VARS)
    setStep(0)
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const meta = STEPS[step]!

  // max-w-6xl matches the site header/hero container width.
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <div ref={topRef} aria-hidden="true" className="scroll-mt-6" />

      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
          Step {step + 1} of {STEPS.length}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={reset}
          className="text-muted-foreground"
        >
          <RiRestartLine aria-hidden="true" />
          Reset
        </Button>
      </div>

      <div className="mt-4">
        <WizardStepper steps={STEPS} current={step} onSelect={goTo} />
      </div>

      <section aria-labelledby="step-title" className="mt-10">
        <h2
          id="step-title"
          className="font-heading text-[1.375rem] font-semibold tracking-tight"
        >
          {meta.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {meta.lead}
        </p>
        <div className="mt-6">
          <StepBody index={step} vars={vars} onChange={onChange} />
        </div>
      </section>

      <div className="mt-10 flex items-center justify-between gap-3 border-t pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => goTo(step - 1)}
          disabled={step === 0}
        >
          <RiArrowLeftLine aria-hidden="true" />
          Back
        </Button>
        <p className="font-mono text-xs text-muted-foreground">
          {step + 1} / {STEPS.length}
        </p>
        <Button
          type="button"
          onClick={() => goTo(step + 1)}
          disabled={step === LAST_STEP}
        >
          Next
          <RiArrowRightLine aria-hidden="true" />
        </Button>
      </div>

      <p className="mt-6 flex items-start gap-2 rounded-lg bg-muted px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
        <RiLockLine
          className="mt-px size-4 flex-none text-primary"
          aria-hidden="true"
        />
        <span>
          These values stay in this browser tab. The page has no server action
          and makes no network call — your entries and your place in the wizard
          are kept in this tab’s session storage only, dropped when the tab
          closes, and the owner password is never stored at all. The only thing
          that leaves is a command you copy yourself.
        </span>
      </p>
    </div>
  )
}
