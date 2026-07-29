"use client"

import { useCallback, useMemo, useState } from "react"
import { RiArrowRightLine, RiInformationLine } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"

import { CommandBlock } from "./command-block"
import {
  databaseCommand,
  EMPTY_VARS,
  envCopyCommands,
  firstDeployCommand,
  googleOAuthLines,
  ownerSeedCommands,
  productionEnvLines,
  productionEnvLocalLines,
  provisionCommand,
  redeployCommand,
  resolve,
  type SetupVars,
} from "./setup-vars"
import { VariablesForm } from "./variables-form"

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8125em]">
      {children}
    </code>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
      <RiInformationLine
        className="mt-0.5 size-4 flex-none text-primary"
        aria-hidden="true"
      />
      <span>{children}</span>
    </p>
  )
}

function Step({
  n,
  title,
  lead,
  last,
  children,
}: {
  n: string
  title: string
  lead: React.ReactNode
  last?: boolean
  children: React.ReactNode
}) {
  const id = `step-${n}`
  return (
    <section aria-labelledby={id} className="flex gap-4 sm:gap-6">
      <div className="flex flex-none flex-col items-center gap-2">
        <span className="flex size-9 flex-none items-center justify-center rounded-full border bg-card font-mono text-xs font-semibold text-primary">
          {n}
        </span>
        {last ? null : (
          <span aria-hidden="true" className="w-px flex-1 bg-border" />
        )}
      </div>
      <div
        className={cn("flex min-w-0 flex-1 flex-col gap-4", !last && "pb-12")}
      >
        <div>
          <h2
            id={id}
            className="font-heading text-[1.375rem] font-semibold tracking-tight"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {lead}
          </p>
        </div>
        {children}
      </div>
    </section>
  )
}

function EnvRow({
  fields,
  file,
  children,
}: {
  fields: string
  file: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3.5 sm:flex-row sm:items-baseline sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1 sm:w-64 sm:flex-none">
        <span className="font-mono text-xs break-all text-foreground">
          {fields}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {file}
        </span>
      </div>
      <div className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  )
}

const REPO = "https://github.com/dev-geddy/backflip/blob/master"

const NEXT_LINKS = [
  {
    href: `${REPO}/devops.md`,
    label: "devops.md",
    body: "Deployment overview: both droplet flavors, prerequisites, quick start.",
  },
  {
    href: `${REPO}/devops/docs/droplet-setup.md`,
    label: "devops/docs/droplet-setup.md",
    body: "Provisioning in full, plus a troubleshooting list for TLS, SSH and OOM.",
  },
  {
    href: `${REPO}/devops/docs/deploy-local.md`,
    label: "devops/docs/deploy-local.md",
    body: "Redeploys from your machine, migrations, rollback by release symlink.",
  },
]

/**
 * Client island for the whole guide: holds the operator's variables and renders
 * every command with them substituted. No persistence by design — reloading the
 * page clears everything.
 */
export function SetupGuide() {
  const [vars, setVars] = useState<SetupVars>(EMPTY_VARS)

  const onChange = useCallback((key: keyof SetupVars, value: string) => {
    setVars((current) => ({ ...current, [key]: value }))
  }, [])

  const r = useMemo(() => resolve(vars), [vars])

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <VariablesForm vars={vars} onChange={onChange} />

      <div className="mt-14 flex flex-col">
        <Step
          n="01"
          title="Provision the droplet"
          lead="One-time, idempotent. Installs nvm Node 24 + corepack yarn 4, pm2, nginx and a Let's Encrypt certificate, hardens SSH to key-only, adds fail2ban and 2 GB of swap, and opens ports 22, 80 and 443 only."
        >
          <CommandBlock lines={provisionCommand(r)} />
          <Note>
            Point the domain’s DNS A record at the droplet before running this —
            certbot verifies over HTTP. If DNS isn’t live yet, setup warns,
            continues, and prints the certbot command to re-run later.
          </Note>
        </Step>

        <Step
          n="02"
          title="Provision the database"
          lead="Installs Postgres 17 from the PGDG repo, bound to loopback only, and creates the app role and database."
        >
          <CommandBlock lines={databaseCommand(r)} />
          <Note>
            It prints a generated password and a ready-made{" "}
            <Mono>DATABASE_URL</Mono> once — copy both into{" "}
            <Mono>.env.production</Mono> in the next step. Re-running never
            overwrites an existing role’s password.
          </Note>
        </Step>

        <Step
          n="03"
          title="Fill in the env files"
          lead="Two files on your machine. The first deploy uploads them to the droplet as .env and .env.local, mode 0600 — they are never committed."
        >
          <CommandBlock lines={envCopyCommands()} />

          <div className="divide-y overflow-hidden rounded-lg border bg-card">
            <EnvRow
              fields="POSTGRES_PASSWORD, DATABASE_URL"
              file=".env.production"
            >
              Straight from step 2’s output. Keep <Mono>POSTGRES_USER</Mono>,{" "}
              <Mono>POSTGRES_DB</Mono> and the port in sync with the URL.
            </EnvRow>
            <EnvRow fields="ENCRYPTION_KEY" file=".env.production">
              Encrypts secrets at rest (AI provider API keys). Generate it with{" "}
              <Mono>openssl rand -base64 32</Mono>.
            </EnvRow>
            <EnvRow fields="DOMAIN" file=".env.production">
              The public domain nginx serves — the same value as <Mono>-d</Mono>{" "}
              above.
            </EnvRow>
            <EnvRow fields="AUTH_SECRET" file=".env.production.local">
              Signs Auth.js sessions. Generate it with{" "}
              <Mono>openssl rand -base64 33</Mono>.
            </EnvRow>
            <EnvRow
              fields="AUTH_TRUST_HOST, AUTH_URL"
              file=".env.production.local"
            >
              The app sits behind a reverse proxy, so both are required.
            </EnvRow>
            <EnvRow
              fields="AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET"
              file=".env.production.local"
            >
              Optional. From a Google Cloud Console OAuth 2.0 client — see
              below. Google sign-in only works for emails already registered on
              the platform.
            </EnvRow>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <CommandBlock
              lines={["openssl rand -base64 32"]}
              label="ENCRYPTION_KEY"
            />
            <CommandBlock
              lines={["openssl rand -base64 33"]}
              label="AUTH_SECRET"
            />
          </div>

          <CommandBlock
            lines={productionEnvLines(r)}
            label=".env.production"
            prompt={false}
          />
          <CommandBlock
            lines={productionEnvLocalLines(r)}
            label=".env.production.local"
            prompt={false}
          />

          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
              Optional — Google sign-in
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              In Google Cloud Console, create an OAuth 2.0 Web application
              client under APIs &amp; Services → Credentials, and register these
              two URLs on it. Its client ID and secret are the{" "}
              <Mono>AUTH_GOOGLE_*</Mono> values.
            </p>
            <CommandBlock
              lines={googleOAuthLines(r)}
              label="Google Cloud Console → Credentials"
              prompt={false}
            />
          </div>
        </Step>

        <Step
          n="04"
          title="Deploy"
          lead="Syncs the repo to the droplet, installs, builds the Next standalone bundle, runs the Drizzle migrations, then flips the release symlink and restarts pm2. The env flags upload your files — pass them on the first run only."
        >
          <CommandBlock lines={firstDeployCommand(r)} label="first deploy" />
          <CommandBlock lines={redeployCommand(r)} label="every run after" />
          <Note>
            Later runs never touch the droplet’s env files, and anything that
            fails before the symlink flip leaves the previous release serving.
            When it finishes, the app is live at <Mono>{r.appUrl}</Mono>.
          </Note>
        </Step>

        <Step
          n="05"
          title="Seed the owner account"
          lead="One-off, after the first deploy. Writes a temporary .env.init, hands it to the locked backflip user on the droplet, runs the seed, then removes it on both ends."
          last
        >
          <CommandBlock lines={ownerSeedCommands(r)} />
          <Note>
            Sign in at <Mono>{r.appUrl}/backflip</Mono> with the owner email and
            password above. Leave the password blank for a Google-only owner.
            Never commit <Mono>.env.init</Mono> — it is gitignored, and the last
            line deletes it.
          </Note>
        </Step>
      </div>

      <div className="mt-16 rounded-xl border bg-card p-5">
        <h2 className="font-heading text-base font-semibold tracking-tight">
          Where the full docs live
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This page is the guided version of the repo’s deployment docs.
        </p>
        <ul className="mt-4 flex flex-col divide-y border-t">
          {NEXT_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-start gap-3 py-3.5 transition-colors hover:text-foreground"
              >
                <RiArrowRightLine
                  className="mt-0.5 size-4 flex-none text-primary transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block font-mono text-xs break-all">
                    {link.label}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {link.body}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
