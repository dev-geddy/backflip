"use client"

import {
  RiDownloadLine,
  RiExternalLinkLine,
  RiInformationLine,
  RiTerminalBoxLine,
} from "@remixicon/react"

import { Button } from "@workspace/ui/components/button"

import { CommandBlock } from "./command-block"
import {
  databaseCommand,
  envCopyCommands,
  firstDeployCommand,
  firstDeployLocalBuildCommand,
  googleOAuthLines,
  ownerSeedCommands,
  productionEnvLines,
  productionEnvLocalLines,
  provisionCommand,
  redeployCommand,
  resolve,
  summaryDocument,
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

/** Where a command box is meant to be executed. Sits directly above the box. */
function RunOn({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
      <RiTerminalBoxLine
        className="size-3.5 flex-none text-primary"
        aria-hidden="true"
      />
      Run on: {children}
    </p>
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

export type StepMeta = {
  id: string
  /** Full heading, shown above the step body. */
  title: string
  /** Stepper label — one or two words. */
  short: string
  /** One to two sentences of context. */
  lead: string
}

/** The wizard's running order. Index = step number - 1. */
export const STEPS: StepMeta[] = [
  {
    id: "get-droplet",
    title: "Get a droplet",
    short: "Get droplet",
    lead: "You need a fresh Ubuntu droplet to deploy to. Create one on DigitalOcean, note its IP, and come back — everything else happens from your machine.",
  },
  {
    id: "clone",
    title: "Clone Backflip locally",
    short: "Clone",
    lead: "Everything in this guide runs from a local clone — provisioning, deploys, migrations, the admin seed. Grab the repo and the few tools the scripts expect.",
  },
  {
    id: "variables",
    title: "Your variables",
    short: "Variables",
    lead: "Fill these in once. Every command in the following steps rewrites itself from these values, so you only ever copy a finished line.",
  },
  {
    id: "droplet",
    title: "Provision the droplet",
    short: "Droplet",
    lead: "One-time, idempotent. Installs nvm Node 24 + corepack yarn 4, pm2, nginx and a Let's Encrypt certificate, hardens SSH to key-only, adds fail2ban and 2 GB of swap, and opens ports 22, 80 and 443 only.",
  },
  {
    id: "database",
    title: "Provision the database",
    short: "Database",
    lead: "Installs Postgres 17 from the PGDG repo, bound to loopback only, and creates the app role and database.",
  },
  {
    id: "env",
    title: "Fill in the env files",
    short: "Env files",
    lead: "Two files on your machine. The first deploy uploads them to the droplet as .env and .env.local, mode 0600 — they are never committed.",
  },
  {
    id: "deploy",
    title: "First deploy",
    short: "Deploy",
    lead: "Syncs the repo to the droplet, installs, builds the Next standalone bundle, runs the Drizzle migrations, then flips the release symlink and restarts pm2. The env flags upload your files — pass them on the first run only.",
  },
  {
    id: "seed",
    title: "Seed the admin account",
    short: "Admin",
    lead: "One-off, after the first deploy. Writes a temporary .env.init, hands it to the locked backflip user on the droplet, runs the seed, then removes it on both ends.",
  },
  {
    id: "summary",
    title: "Save your summary",
    short: "Summary",
    lead: "Everything you entered plus the day-two command reference, as one plain-text file. This page forgets your values when the tab closes — this file doesn't.",
  },
]

export const LAST_STEP = STEPS.length - 1

/**
 * The body of one wizard step. Split from the shell so the shell only deals
 * with navigation and persistence; all guide copy and command blocks live here.
 */
export function StepBody({
  index,
  vars,
  onChange,
}: {
  index: number
  vars: SetupVars
  onChange: (key: keyof SetupVars, value: string) => void
}) {
  const r = resolve(vars)

  if (index === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="max-w-xl divide-y overflow-hidden rounded-lg border bg-card">
          <div className="px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Image</span> — Ubuntu
            LTS (24.04 or newer), plain image, no marketplace app.
          </div>
          <div className="px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Size</span> — the
            cheapest 512 MB droplet is enough to start: provisioning adds 2 GB
            of swap, and the build-locally deploy keeps heavy work off the
            droplet. Pick 2 GB+ if you&apos;d rather build on the droplet
            itself.
          </div>
          <div className="px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Authentication</span>{" "}
            — choose SSH key and add your <em>public</em> key during creation.
            No key yet? Generate one below first.
          </div>
          <div className="px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">After creation</span>{" "}
            — copy the droplet&apos;s public IP; it&apos;s the first variable in
            the next step.
          </div>
          <div className="px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              Point your domain at it
            </span>{" "}
            — add a DNS <Mono>A</Mono> record for the domain you&apos;ll use,
            directed at the droplet&apos;s IP, right after creation. Let&apos;s
            Encrypt verifies domain ownership over HTTP, so until DNS resolves
            to this droplet the provisioning step can&apos;t issue the TLS
            certificate and the site won&apos;t be reachable at your domain. If
            DNS is on DigitalOcean: Networking → Domains → your domain →{" "}
            <Mono>A</Mono> record, hostname <Mono>@</Mono> (or a subdomain),
            directed to the droplet. DNS changes take a few minutes to propagate
            — adding the record now means it&apos;s live by the time you
            provision.
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <RunOn>your machine — any shell</RunOn>
          <CommandBlock
            lines={[
              'ssh-keygen -t ed25519 -f ~/.ssh/id_backflip -C "backflip"',
              "cat ~/.ssh/id_backflip.pub",
            ]}
            label="generate an ssh key (skip if you have one)"
          />
        </div>
        <Note>
          Upload the printed <Mono>.pub</Mono> contents in the DigitalOcean
          panel under Settings → Security → SSH keys, then pick that key when
          creating the droplet. The private half (
          <Mono>~/.ssh/id_backflip</Mono>) stays on your machine — it&apos;s the
          key path variable in the next step.
        </Note>
        <div>
          <Button
            size="lg"
            render={
              <a
                href="https://m.do.co/c/773b078c800a"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Create a droplet on DigitalOcean
            <RiExternalLinkLine aria-hidden="true" />
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Referral link — new DigitalOcean accounts get free starting credit,
          and it supports this project. Already have a droplet? Skip straight to
          the next step.
        </p>
      </div>
    )
  }

  if (index === 1) {
    return (
      <div className="flex flex-col gap-4">
        <div className="max-w-xl divide-y overflow-hidden rounded-lg border bg-card">
          <div className="px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">git</span> — to clone
            the repo and pull updates.
          </div>
          <div className="px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              Node.js 24 + corepack
            </span>{" "}
            — same major the droplet runs; corepack ships with Node and
            activates the pinned yarn 4 automatically. <Mono>nvm</Mono> is the
            easiest way to get it.
          </div>
          <div className="px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              OpenSSH + openssl
            </span>{" "}
            — the deploy scripts drive <Mono>ssh</Mono>/<Mono>scp</Mono>, and
            two env secrets are generated with <Mono>openssl rand</Mono>.
            Preinstalled on macOS and Linux; on Windows use WSL.
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <RunOn>your machine — any shell</RunOn>
          <CommandBlock
            lines={[
              "git clone https://github.com/dev-geddy/backflip.git",
              "cd backflip",
              "corepack enable",
              "corepack yarn install",
            ]}
          />
        </div>
        <Note>
          Backflip is developed primarily with <strong>Claude Code</strong> —
          the repo ships instructions, skills and doc contracts tuned for it
          (that&apos;s what the Start building phase leans on). Other AI coding
          agents are untested.
        </Note>
      </div>
    )
  }

  if (index === 2) return <VariablesForm vars={vars} onChange={onChange} />

  if (index === 3) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <RunOn>your machine — repo root</RunOn>
          <CommandBlock lines={provisionCommand(r)} />
        </div>
        <Note>
          Point the domain’s DNS A record at the droplet before running this —
          certbot verifies over HTTP. If DNS isn’t live yet, setup warns,
          continues, and prints the certbot command to re-run later.
        </Note>
      </div>
    )
  }

  if (index === 4) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <RunOn>your machine — repo root</RunOn>
          <CommandBlock lines={databaseCommand(r)} />
        </div>
        <Note>
          It prints a generated password and a ready-made{" "}
          <Mono>DATABASE_URL</Mono> once — copy both out of the terminal now,
          the next step pastes them into <Mono>.env.production</Mono>.
          Re-running never overwrites an existing role’s password.
        </Note>
      </div>
    )
  }

  if (index === 5) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <RunOn>your machine — repo root</RunOn>
          <CommandBlock lines={envCopyCommands()} />
        </div>

        <div className="divide-y overflow-hidden rounded-lg border bg-card">
          <EnvRow
            fields="POSTGRES_PASSWORD, DATABASE_URL"
            file=".env.production"
          >
            Straight from the previous step’s output. Keep{" "}
            <Mono>POSTGRES_USER</Mono>, <Mono>POSTGRES_DB</Mono> and the port in
            sync with the URL.
          </EnvRow>
          <EnvRow fields="ENCRYPTION_KEY" file=".env.production">
            Encrypts secrets at rest (AI provider API keys). Generate it with{" "}
            <Mono>openssl rand -base64 32</Mono>.
          </EnvRow>
          <EnvRow fields="DOMAIN" file=".env.production">
            The public domain nginx serves — the same value as <Mono>-d</Mono>{" "}
            in the commands above.
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
            Optional. From a Google Cloud Console OAuth 2.0 client — see below.
            Google sign-in only works for emails already registered on the
            platform.
          </EnvRow>
        </div>

        <div className="flex flex-col gap-2">
          <RunOn>your machine — any shell</RunOn>
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

        <div className="flex flex-col gap-3 border-t pt-4">
          <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Optional — Google sign-in
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            In Google Cloud Console, create an OAuth 2.0 Web application client
            under APIs &amp; Services → Credentials, and register these two URLs
            on it. Its client ID and secret are the <Mono>AUTH_GOOGLE_*</Mono>{" "}
            values.
          </p>
          <CommandBlock
            lines={googleOAuthLines(r)}
            label="Google Cloud Console → Credentials"
            prompt={false}
          />
        </div>
      </div>
    )
  }

  if (index === 6) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <RunOn>your machine — repo root</RunOn>
          <CommandBlock lines={firstDeployCommand(r)} label="first deploy" />
          <CommandBlock lines={redeployCommand(r)} label="every run after" />
        </div>
        <Note>
          Later runs drop the two <Mono>--env</Mono> flags: they never touch the
          droplet’s env files again. Anything that fails before the symlink flip
          leaves the previous release serving. When it finishes, the app is live
          at <Mono>{r.appUrl}</Mono>.
        </Note>

        <div className="flex flex-col gap-3 border-t pt-4">
          <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Faster alternative — build locally
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Same flags, same blue/green semantics, but the typecheck and build
            run on your (multi-core) machine and only the assembled release is
            shipped — minutes become seconds. Drop the two <Mono>--env</Mono>{" "}
            flags on later runs here too.
          </p>
          <div className="flex flex-col gap-2">
            <RunOn>your machine — repo root</RunOn>
            <CommandBlock
              lines={firstDeployLocalBuildCommand(r)}
              label="deploy-for-pm2-build-locally.sh"
            />
          </div>
          <Note>
            It needs local deps installed (<Mono>corepack yarn install</Mono>)
            and refuses to run if the traced bundle picks up a native module for
            your OS — use <Mono>deploy-for-pm2.sh</Mono> whenever that happens.
          </Note>
        </div>
      </div>
    )
  }

  if (index === 7) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <RunOn>your machine — repo root</RunOn>
          <CommandBlock lines={ownerSeedCommands(r)} />
        </div>
        <Note>
          All four lines run locally — <Mono>scp</Mono> and <Mono>ssh</Mono>{" "}
          reach the droplet for you. Never commit <Mono>.env.init</Mono>: it is
          gitignored, and the last line deletes it.
        </Note>
        <Note>
          Done. Sign in at <Mono>{r.appUrl}/backflip</Mono> with the owner email
          and password from step 3. Leave the password blank for a Google-only
          owner.
        </Note>
      </div>
    )
  }

  const doc = summaryDocument(vars)
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          type="button"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([doc], { type: "text/plain;charset=utf-8" })
            )
            const a = document.createElement("a")
            a.href = url
            a.download = "backflip-setup-summary.txt"
            a.click()
            URL.revokeObjectURL(url)
          }}
        >
          <RiDownloadLine aria-hidden="true" />
          Download backflip-setup-summary.txt
        </Button>
      </div>
      <Note>
        The file includes the owner password when one was set — store it
        somewhere private (a password manager beats a Downloads folder).
      </Note>
      <CommandBlock
        lines={doc.split("\n")}
        label="backflip-setup-summary.txt"
        prompt={false}
      />
    </div>
  )
}
