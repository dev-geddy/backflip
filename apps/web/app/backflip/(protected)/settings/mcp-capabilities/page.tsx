import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"
import { RiArrowRightLine } from "@remixicon/react"

import { requireCapability } from "@/app/_lib/auth/guard"
import { listClients } from "@/app/_lib/oauth/clients"
import { isMcpEnabled, isMcpForcedOff } from "@/app/_lib/oauth/config"
import { grantHealth } from "@/app/_lib/oauth/grant-health"
import { SCOPE_LABELS } from "@/app/_lib/oauth/scopes"
import { listGrants } from "@/app/_lib/oauth/tokens"
import { TOOL_DEFS, type ToolDef, type ToolGroup } from "@/app/_lib/mcp/tools"
import { SectionLabel } from "../../_components/page-heading"
import { ConnectionsSection } from "./_components/connections-section"
import type { Metadata } from "next"
import { titleFor } from "../../../_lib/crumbs"

export const metadata: Metadata = {
  title: titleFor("/backflip/settings/mcp-capabilities"),
}

/** Section order for the capability list — declaration order within each. */
const GROUPS: ToolGroup[] = ["Platform"]

/**
 * /backflip/settings/mcp-capabilities — owner-only read surface listing every
 * tool a connected MCP client can call. Renders straight from `TOOL_DEFS`
 * (`apps/web/app/_lib/mcp/tools/index.ts`) — there is no hand-maintained copy
 * of the tool list to drift from the real one.
 *
 * The header states two independent facts: whether the connector is switched
 * on (`isMcpEnabled()` / `isMcpForcedOff()`) and whether it is configured (at
 * least one OAuth client exists). A connector can be on with zero clients —
 * that is a normal, expected state, not an error — so the two are shown side
 * by side rather than collapsed into one status.
 *
 * The maximum surface only answers half the question, though — a stale grant
 * (one minted before a capability existed) can look identical to a healthy
 * one while quietly seeing fewer tools. The "Your connections" section below
 * reconciles the two: for each of the signed-in owner's own grants
 * (`listGrants`), `grantHealth` reports how many of the tools it actually
 * reaches, and the capability list further down marks any row that
 * connection cannot see.
 *
 * @spec L2-MCP-64, L2-MCP-65
 */
export default async function McpCapabilitiesPage() {
  const user = await requireCapability("settings")

  const [enabled, clients, grants] = await Promise.all([
    isMcpEnabled(),
    listClients(),
    listGrants(user.id),
  ])
  const forcedOff = isMcpForcedOff()
  const clientCount = clients.length

  const grantHealths = grants.map((grant) => ({
    grant,
    health: grantHealth(grant.scopes, user.role ?? "teammate"),
  }))

  // The signed-in owner's best case: a tool this row marks is one none of
  // their connections can currently see, not just this one.
  const bestVisibleTools = new Set(
    grantHealths.flatMap(({ health }) => health.visibleTools)
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          MCP capabilities
        </h2>
        <p className="text-sm text-muted-foreground">
          Every tool a connected MCP client can call, in one condensed list.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatusRow
            label="Connector"
            on={enabled}
            onLabel="On"
            offLabel="Off"
            detail={
              forcedOff
                ? "Forced off by MCP_ENABLED=false in the deployment environment — the admin toggle cannot override it."
                : enabled
                  ? "A Claude client can attempt to connect."
                  : "Turned off — no client can connect until an owner enables it."
            }
          />
          <StatusRow
            label="Configured"
            on={clientCount > 0}
            onLabel={`${clientCount} OAuth client${clientCount === 1 ? "" : "s"}`}
            offLabel="No clients yet"
            detail={
              clientCount > 0
                ? "At least one OAuth client exists."
                : "Nobody can connect — add a client to let one."
            }
          />
        </div>
        <Link
          href="/backflip/settings"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Manage the connector and its clients
          <RiArrowRightLine className="size-3.5" />
        </Link>
      </div>

      <ConnectionsSection grants={grantHealths} />

      <p className="text-xs text-muted-foreground">
        This is the maximum surface — a tool is only reachable when the
        connected token was granted its scope <em>and</em> the connected
        user&rsquo;s role holds it, so any one connection sees the intersection
        of the two, not this full list.
      </p>

      {GROUPS.map((group) => {
        const tools = TOOL_DEFS.filter((tool) => tool.group === group)
        if (tools.length === 0) return null
        return (
          <section
            key={group}
            className="flex flex-col gap-4 rounded-xl border bg-card p-5"
          >
            <SectionLabel>{group}</SectionLabel>
            <div className="flex flex-col divide-y">
              {tools.map((tool) => (
                <ToolRow
                  key={tool.name}
                  tool={tool}
                  inYourConnection={bestVisibleTools.has(tool.name)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function StatusRow({
  label,
  on,
  onLabel,
  offLabel,
  detail,
}: {
  label: string
  on: boolean
  onLabel: string
  offLabel: string
  detail: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <SectionLabel>{label}</SectionLabel>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-1.5 flex-none rounded-full",
            on ? "bg-emerald-500" : "bg-muted-foreground/30"
          )}
        />
        <span className="text-sm font-medium">{on ? onLabel : offLabel}</span>
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function ToolRow({
  tool,
  inYourConnection,
}: {
  tool: ToolDef
  inYourConnection: boolean
}) {
  const scope = SCOPE_LABELS[tool.scope]
  return (
    <div className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{tool.title}</span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {tool.name}
          </code>
          {inYourConnection ? null : (
            <span className="text-[11px] text-muted-foreground/60">
              not in your connection
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{tool.summary}</p>
      </div>
      <div className="flex flex-none items-center gap-1.5">
        <Badge variant="outline">{scope.title}</Badge>
        <Badge
          className={cn(
            "border-transparent",
            tool.mutates
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              : "bg-muted text-muted-foreground"
          )}
        >
          {tool.mutates ? "Writes" : "Read"}
        </Badge>
      </div>
    </div>
  )
}
