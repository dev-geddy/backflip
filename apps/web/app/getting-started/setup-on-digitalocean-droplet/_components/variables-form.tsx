"use client"

import {
  RiArrowRightSLine,
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
  RiRefreshLine,
} from "@remixicon/react"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { FieldGuidance } from "./field-guidance"
import {
  DEFAULT_APP_NAME,
  DEFAULT_APP_PORT,
  type SetupVars,
} from "./setup-vars"

type FieldSpec = {
  key: keyof SetupVars
  label: string
  placeholder: string
  type?: "text" | "email"
}

const CORE: FieldSpec[] = [
  { key: "host", label: "Droplet host or IP", placeholder: "203.0.113.10" },
  {
    key: "sshKey",
    label: "SSH private key path",
    placeholder: "~/.ssh/id_ed25519",
  },
  { key: "domain", label: "Domain", placeholder: "app.example.com" },
  {
    key: "certbotEmail",
    label: "Let’s Encrypt email",
    placeholder: "ops@example.com",
    type: "email",
  },
]

const OPTIONAL: FieldSpec[] = [
  { key: "appName", label: "App name", placeholder: DEFAULT_APP_NAME },
  { key: "appPort", label: "App port", placeholder: DEFAULT_APP_PORT },
]

const HOSTNAME_RE =
  /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isHost(value: string) {
  const m = value.match(IPV4_RE)
  if (m) return m.slice(1).every((octet) => Number(octet) <= 255)
  return HOSTNAME_RE.test(value)
}

/**
 * Per-field "looks right" checks — light validation for the green tick only.
 * Nothing blocks: commands render either way, placeholders fill the gaps.
 */
const VALID: Record<keyof SetupVars, (value: string) => boolean> = {
  host: isHost,
  sshKey: (v) => /^(~\/|\.{0,2}\/|\/)\S+$/.test(v) && !v.endsWith(".pub"),
  domain: (v) => HOSTNAME_RE.test(v) && v.includes("."),
  certbotEmail: (v) => EMAIL_RE.test(v),
  appName: (v) => /^[a-z0-9][a-z0-9-_]*$/i.test(v),
  appPort: (v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 65535,
  adminEmail: (v) => EMAIL_RE.test(v),
  adminPassword: (v) => v.length >= 8,
}

/** Fixed-width slot left of every input: green tick when valid, else empty. */
function ValidTick({ valid }: { valid: boolean }) {
  return (
    <span className="flex size-4 flex-none items-center justify-center self-center">
      {valid ? (
        <RiCheckLine
          className="size-4 text-emerald-600 dark:text-emerald-400"
          aria-label="Looks valid"
        />
      ) : null}
    </span>
  )
}

// Unambiguous alphabet (no 0/O, 1/l/I) — the operator may need to retype this.
const PASSWORD_ALPHABET =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-_!"

/** 24 chars via crypto.getRandomValues — rejection-sampled, no modulo bias. */
function generatePassword() {
  const out: string[] = []
  const max = 256 - (256 % PASSWORD_ALPHABET.length)
  while (out.length < 24) {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    for (const b of bytes) {
      if (b < max && out.length < 24) {
        out.push(PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]!)
      }
    }
  }
  return out.join("")
}

/** A value the operator has set to something other than the script default. */
function overridden(value: string, fallback: string) {
  const trimmed = value.trim()
  return trimmed !== "" && trimmed !== fallback
}

function hasInstanceOverride(vars: SetupVars) {
  return (
    overridden(vars.appName, DEFAULT_APP_NAME) ||
    overridden(vars.appPort, DEFAULT_APP_PORT)
  )
}

/** Uppercase micro-label heading a field group. */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </span>
  )
}

/**
 * Step 1 of the wizard, and the one form on the page: every command in the
 * later steps reads from this state. Nothing is submitted or fetched; the
 * wizard shell mirrors it into sessionStorage, minus the owner password.
 *
 * Layout is form-left / guidance-right (stacked below `lg`): per-field help
 * lives in the sidebar, keyed off the focused field, so the form itself stays a
 * single uncluttered column.
 */
export function VariablesForm({
  vars,
  onChange,
}: {
  vars: SetupVars
  onChange: (key: keyof SetupVars, value: string) => void
}) {
  const [revealPassword, setRevealPassword] = useState(false)
  const [focused, setFocused] = useState<keyof SetupVars | null>(null)
  // `null` = untouched, follow the values: collapsed by default, but already
  // open when a non-default instance name/port is present. Restored values
  // arrive after mount (the shell reads sessionStorage in an effect), so this
  // has to be derived rather than an initial state. Any manual toggle wins.
  const [optionalToggled, setOptionalToggled] = useState<boolean | null>(null)
  const optionalOpen = optionalToggled ?? hasInstanceOverride(vars)

  function renderField(spec: FieldSpec) {
    const id = `var-${spec.key}`
    const value = vars[spec.key]
    return (
      <Field key={spec.key}>
        <FieldLabel htmlFor={id}>{spec.label}</FieldLabel>
        <div className="flex gap-2">
          <ValidTick valid={VALID[spec.key](value.trim())} />
          <Input
            id={id}
            name={spec.key}
            type={spec.type ?? "text"}
            autoComplete="off"
            spellCheck={false}
            value={value}
            placeholder={spec.placeholder}
            onFocus={() => setFocused(spec.key)}
            onChange={(event) => onChange(spec.key, event.target.value)}
          />
        </div>
      </Field>
    )
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <div className="w-full max-w-[26rem] min-w-0 flex-1 rounded-xl border bg-card px-5 py-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">{CORE.map(renderField)}</div>

          <Collapsible
            open={optionalOpen}
            onOpenChange={(open) => setOptionalToggled(open)}
            className="flex flex-col gap-4 border-t pt-5"
          >
            <CollapsibleTrigger className="group flex w-full items-center gap-1.5 text-left">
              <RiArrowRightSLine
                className="size-4 flex-none text-muted-foreground transition-transform group-data-[panel-open]:rotate-90"
                aria-hidden="true"
              />
              <GroupLabel>Optional — multi-instance droplets</GroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-4">
              {OPTIONAL.map(renderField)}
            </CollapsibleContent>
          </Collapsible>

          <div className="flex flex-col gap-4 border-t pt-5">
            <GroupLabel>Owner account — step 7 only</GroupLabel>
            <Field>
              <FieldLabel htmlFor="var-adminEmail">Owner email</FieldLabel>
              <div className="flex gap-2">
                <ValidTick valid={VALID.adminEmail(vars.adminEmail.trim())} />
                <Input
                  id="var-adminEmail"
                  name="adminEmail"
                  type="email"
                  autoComplete="off"
                  spellCheck={false}
                  value={vars.adminEmail}
                  placeholder="you@example.com"
                  onFocus={() => setFocused("adminEmail")}
                  onChange={(event) =>
                    onChange("adminEmail", event.target.value)
                  }
                />
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="var-adminPassword">
                Owner password
              </FieldLabel>
              <div className="flex gap-2">
                <ValidTick valid={VALID.adminPassword(vars.adminPassword)} />
                <Input
                  id="var-adminPassword"
                  name="adminPassword"
                  type={revealPassword ? "text" : "password"}
                  autoComplete="new-password"
                  spellCheck={false}
                  value={vars.adminPassword}
                  placeholder="a long random passphrase"
                  onFocus={() => setFocused("adminPassword")}
                  onChange={(event) =>
                    onChange("adminPassword", event.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="flex-none"
                  aria-label={
                    revealPassword ? "Hide password" : "Show password"
                  }
                  onClick={() => setRevealPassword((shown) => !shown)}
                >
                  {revealPassword ? (
                    <RiEyeOffLine aria-hidden="true" />
                  ) : (
                    <RiEyeLine aria-hidden="true" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="flex-none"
                  aria-label="Generate a random password"
                  onClick={() => {
                    onChange("adminPassword", generatePassword())
                    setFocused("adminPassword")
                    setRevealPassword(true)
                  }}
                >
                  <RiRefreshLine aria-hidden="true" />
                </Button>
              </div>
              <FieldDescription>
                Not stored — refill after a reload.
              </FieldDescription>
            </Field>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[26rem] min-w-0 lg:w-80 lg:max-w-none lg:flex-none">
        <FieldGuidance field={focused} vars={vars} />
      </div>
    </div>
  )
}
