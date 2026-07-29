"use client"

import { RiCursorLine } from "@remixicon/react"

import { CommandBlock } from "./command-block"
import {
  DEFAULT_APP_NAME,
  DEFAULT_APP_PORT,
  resolve,
  type SetupVars,
} from "./setup-vars"

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8125em] break-all">
      {children}
    </code>
  )
}

type Guidance = {
  title: string
  /** One paragraph per entry. Two to four short sentences in total. */
  body: React.ReactNode[]
  /** Optional trailing block — a copyable command, a caveat callout. */
  extra?: React.ReactNode
}

/**
 * `chmod 600 <path>` for the key the operator is actually using, falling back to
 * a highlighted `<your-key>` placeholder while the field is still empty.
 */
function chmodLine(sshKey: string) {
  const path = sshKey.trim()
  return `chmod 600 ${path || "~/.ssh/<your-key>"}`
}

function guidanceFor(field: keyof SetupVars, vars: SetupVars): Guidance {
  const appUrl = resolve(vars).appUrl

  switch (field) {
    case "host":
      return {
        title: "Droplet host or IP",
        body: [
          "The droplet’s public IPv4 address — every command in this guide connects to it over SSH.",
          "Get it from the DigitalOcean dashboard → Droplets → your droplet. A hostname works too, as long as it resolves to that droplet.",
        ],
      }
    case "sshKey":
      return {
        title: "SSH private key path",
        body: [
          "Path on your machine to the private key whose public half was added to the droplet as root’s key — usually the key you picked when creating it.",
          "It must be the droplet’s root key: the setup and deploy scripts all connect as root. Permissions must be 0600, or ssh refuses to use it.",
        ],
        extra: <CommandBlock lines={[chmodLine(vars.sshKey)]} compact />,
      }
    case "domain":
      return {
        title: "Domain",
        body: [
          "The public hostname nginx will serve this app on.",
          <>
            Its DNS <Mono>A</Mono> record must already point at the droplet IP
            before TLS can be issued — Let’s Encrypt verifies over HTTP. Add the
            record at your DNS provider, wherever the domain’s nameservers live.
          </>,
        ],
      }
    case "certbotEmail":
      return {
        title: "Let’s Encrypt email",
        body: [
          "Where Let’s Encrypt sends renewal failures and certificate expiry notices.",
          "Any mailbox you actually read — it is not published anywhere and nothing else is sent to it.",
        ],
      }
    case "appName":
      return {
        title: "App name",
        body: [
          "Only needed when one droplet runs several instances. It names the pm2 process and the nginx site.",
          <>
            Leave blank for <Mono>{DEFAULT_APP_NAME}</Mono>, the script default.
          </>,
        ],
      }
    case "appPort":
      return {
        title: "App port",
        body: [
          "The loopback port nginx proxies to. It is never exposed publicly — only nginx talks to it.",
          <>
            Must be unique per instance on the droplet. Leave blank for{" "}
            <Mono>{DEFAULT_APP_PORT}</Mono>, the script default.
          </>,
        ],
      }
    case "adminEmail":
      return {
        title: "Owner email",
        body: [
          <>
            The first admin account, seeded in step 6. It signs in at{" "}
            <Mono>{appUrl}/backflip</Mono>.
          </>,
          "Use an address you can receive mail at — verification and password resets go there.",
        ],
      }
    case "adminPassword":
      return {
        title: "Owner password",
        body: [
          "You choose this one; nothing hands it to you. It becomes the owner’s sign-in password on the admin console.",
          "Leave it blank for a Google-only owner. This page never stores it — it stays in memory and is gone after a reload, so refill it before running step 6.",
        ],
      }
  }
}

/**
 * The step-1 guidance panel: what the focused field is and where to get its
 * value. Driven purely by focus — `field` stays on the last focused key after a
 * blur, so the panel never blanks out mid-typing.
 */
export function FieldGuidance({
  field,
  vars,
}: {
  field: keyof SetupVars | null
  vars: SetupVars
}) {
  const guidance = field ? guidanceFor(field, vars) : null

  // `lg:top-20` clears the sticky site header (h-14) once the panel pins.
  return (
    <aside className="rounded-xl border bg-card px-4 py-4 lg:sticky lg:top-20">
      <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
        What this needs
      </p>

      <div aria-live="polite" className="mt-3">
        {guidance ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{guidance.title}</p>
            {guidance.body.map((paragraph, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
            {guidance.extra ? (
              <div className="mt-1">{guidance.extra}</div>
            ) : null}
          </div>
        ) : (
          <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <RiCursorLine
              className="mt-0.5 size-4 flex-none text-primary"
              aria-hidden="true"
            />
            <span>Click into a field to see what it needs.</span>
          </p>
        )}
      </div>
    </aside>
  )
}
