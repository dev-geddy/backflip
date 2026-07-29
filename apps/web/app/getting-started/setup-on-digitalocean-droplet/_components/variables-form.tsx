"use client"

import { RiEyeLine, RiEyeOffLine, RiLockLine } from "@remixicon/react"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import {
  DEFAULT_APP_NAME,
  DEFAULT_APP_PORT,
  type SetupVars,
} from "./setup-vars"

type FieldSpec = {
  key: keyof SetupVars
  label: string
  placeholder: string
  hint: string
  type?: "text" | "email"
  wide?: boolean
}

const CORE: FieldSpec[] = [
  {
    key: "host",
    label: "Droplet host or IP",
    placeholder: "203.0.113.10",
    hint: "The droplet's public IPv4 — DigitalOcean dashboard → Droplets → your droplet.",
  },
  {
    key: "sshKey",
    label: "SSH private key path",
    placeholder: "~/.ssh/id_ed25519",
    hint: "Local private key with root access, chosen when the droplet was created. Needs mode 600.",
  },
  {
    key: "domain",
    label: "Domain",
    placeholder: "app.example.com",
    hint: "Its DNS A record must already point at the droplet IP — Let's Encrypt verifies over HTTP.",
  },
  {
    key: "certbotEmail",
    label: "Let's Encrypt email",
    placeholder: "ops@example.com",
    hint: "Where certificate expiry notices go. Omit the -m flag to register without one.",
    type: "email",
  },
]

const OPTIONAL: FieldSpec[] = [
  {
    key: "appName",
    label: "App name",
    placeholder: DEFAULT_APP_NAME,
    hint: `Instance name — pm2 process + nginx site. Leave blank for ${DEFAULT_APP_NAME}.`,
  },
  {
    key: "appPort",
    label: "App port",
    placeholder: DEFAULT_APP_PORT,
    hint: `Loopback port nginx proxies to. Leave blank for ${DEFAULT_APP_PORT}; unique per instance.`,
  },
]

/**
 * The one shared form for the page. Every command below it reads from this
 * state — nothing is submitted, stored, or fetched.
 */
export function VariablesForm({
  vars,
  onChange,
}: {
  vars: SetupVars
  onChange: (key: keyof SetupVars, value: string) => void
}) {
  const [revealPassword, setRevealPassword] = useState(false)

  function renderField(spec: FieldSpec) {
    const id = `var-${spec.key}`
    return (
      <Field key={spec.key} className={spec.wide ? "sm:col-span-2" : undefined}>
        <FieldLabel htmlFor={id}>{spec.label}</FieldLabel>
        <Input
          id={id}
          name={spec.key}
          type={spec.type ?? "text"}
          autoComplete="off"
          spellCheck={false}
          value={vars[spec.key]}
          placeholder={spec.placeholder}
          onChange={(event) => onChange(spec.key, event.target.value)}
        />
        <FieldDescription>{spec.hint}</FieldDescription>
      </Field>
    )
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          Your variables
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill these in once — every command on this page rewrites itself as you
          type.
        </p>
      </div>

      <div className="flex flex-col gap-6 px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-2">{CORE.map(renderField)}</div>

        <div className="flex flex-col gap-4 border-t pt-5">
          <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Optional — multi-instance droplets
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {OPTIONAL.map(renderField)}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t pt-5">
          <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Owner account — step 5 only
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="var-adminEmail">Owner email</FieldLabel>
              <Input
                id="var-adminEmail"
                name="adminEmail"
                type="email"
                autoComplete="off"
                spellCheck={false}
                value={vars.adminEmail}
                placeholder="you@example.com"
                onChange={(event) => onChange("adminEmail", event.target.value)}
              />
              <FieldDescription>
                The first admin. Signs in at the admin console after seeding.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="var-adminPassword">
                Owner password
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="var-adminPassword"
                  name="adminPassword"
                  type={revealPassword ? "text" : "password"}
                  autoComplete="new-password"
                  spellCheck={false}
                  value={vars.adminPassword}
                  placeholder="a long random passphrase"
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
              </div>
              <FieldDescription>
                Pick it yourself. Leave blank for a Google-only owner (no
                password).
              </FieldDescription>
            </Field>
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-lg bg-muted px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
          <RiLockLine
            className="mt-px size-4 flex-none text-primary"
            aria-hidden="true"
          />
          <span>
            These values stay in this browser tab. The page has no server
            action, no storage and no network call — the only thing that leaves
            is a command you copy yourself.
          </span>
        </p>
      </div>
    </div>
  )
}
