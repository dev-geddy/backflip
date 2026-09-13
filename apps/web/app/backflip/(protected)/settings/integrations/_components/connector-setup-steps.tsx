import Link from "next/link"
import { RiCheckLine } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"

import { ConnectorCopyField } from "./connector-copy-field"

/**
 * Numbered, stateful setup walkthrough at the top of the connector pane.
 * Steps 1 and 2 reflect real state this page actually has (`enabled`,
 * whether any client exists) — they are never a static checklist. Steps 3-5
 * happen elsewhere (Claude's own UI, the consent screen, the connected
 * user's account) where this page has no visibility, so they render as
 * guidance rather than a fabricated done/not-done toggle — copy says as much
 * for the one step that can never be "done" (step 3).
 *
 * @spec L2-MCP-67
 */
export function ConnectorSetupSteps({
  enabled,
  forcedOff,
  clientCount,
  mcpUrl,
}: {
  /** Resolved reachability: `settings.enabled && !forcedOff` (`isMcpEnabled()`). */
  enabled: boolean
  /** Whether `MCP_ENABLED=false` is vetoing the switch regardless (`L2-MCP-37`). */
  forcedOff: boolean
  clientCount: number
  /** The connector endpoint Claude is pointed at (`L2-MCP-11`). */
  mcpUrl: string
}) {
  const origin = originOf(mcpUrl)

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div>
        <div className="text-sm font-medium">Guided setup</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Five steps to get a Claude client reading this platform through the
          MCP connector. Connector settings are cached for up to ~30 seconds, so
          a toggle you just saved can take a moment to take effect elsewhere —
          that&rsquo;s expected, not a failed save.
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        <Step index={1} done={enabled} title="Enable the connector">
          {enabled ? (
            <p>The connector is switched on and reachable.</p>
          ) : forcedOff ? (
            <p>
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                MCP_ENABLED=false
              </code>{" "}
              is set in this deployment&rsquo;s environment and forces the
              connector off regardless of the switch below. Fix that in the
              deployment&rsquo;s environment first.
            </p>
          ) : (
            <p>Turn on the switch below.</p>
          )}
        </Step>

        <Step index={2} done={clientCount > 0} title="Create a client">
          {clientCount > 0 ? (
            <p>
              {clientCount} client{clientCount === 1 ? "" : "s"} registered,
              below.
            </p>
          ) : (
            <p>
              Add a client in the Clients section below — nobody can connect
              until one exists.
            </p>
          )}
        </Step>

        <Step index={3} manual title="Copy the connection details into Claude">
          <div className="flex flex-col gap-2">
            <p>
              This step is always manual — go to{" "}
              <span className="font-medium text-foreground">
                Add custom connector
              </span>{" "}
              in Claude and paste in the server URL below.
            </p>
            <ConnectorCopyField label="Remote MCP server URL" value={mcpUrl} />
            <p>
              The endpoint is{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                {mcpUrl}
              </code>
              , <strong className="text-foreground">not</strong>{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                {origin}/mcp
              </code>{" "}
              — that shorter path 404s, which looks like a broken connector
              rather than the typo it actually is.
            </p>
            <p>
              Claude Code also needs its client&rsquo;s loopback checkbox ticked
              (see Clients below) — it redirects to a different random localhost
              port on every connection.
            </p>
          </div>
        </Step>

        <Step index={4} title="Approve the capabilities">
          <p>
            The consent screen Claude shows on first connect — not this admin —
            is where scopes are actually granted. A connection only ever sees
            the tools whose scope was granted there{" "}
            <strong className="text-foreground">and</strong> whose capability
            the approving user&rsquo;s role still holds.
          </p>
        </Step>

        <Step index={5} title="Verify">
          <p>
            <Link
              href="/backflip/settings/mcp-capabilities"
              className="font-medium text-foreground underline underline-offset-2"
            >
              Capabilities
            </Link>{" "}
            shows what each connection can actually see, tool by tool — check it
            after connecting rather than guessing from the scope names.
          </p>
        </Step>
      </ol>
    </div>
  )
}

function originOf(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return url
  }
}

function Step({
  index,
  done,
  manual,
  title,
  children,
}: {
  index: number
  done?: boolean
  /** Step 3: never "done" — flagged so the badge never claims otherwise. */
  manual?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-5 flex-none items-center justify-center rounded-full border text-[11px] font-medium",
          done
            ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
            : "border-input text-muted-foreground"
        )}
      >
        {done ? <RiCheckLine aria-hidden="true" className="size-3" /> : index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {title}
          {manual ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Manual step
            </span>
          ) : null}
        </div>
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground [&_code]:text-foreground [&_strong]:text-foreground">
          {children}
        </div>
      </div>
    </li>
  )
}
