import Link from "next/link"

import { RiArrowRightLine } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"

import type { OAuthGrant } from "@/app/_lib/oauth/types"
import type { GrantHealth } from "@/app/_lib/oauth/grant-health"
import { TOOL_DEFS } from "@/app/_lib/mcp/tools"
import { SectionLabel } from "../../../_components/page-heading"

const DATE_FMT = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })

export type GrantWithHealth = { grant: OAuthGrant; health: GrantHealth }

/**
 * "What can my actual connection see right now?" — the reconciliation the
 * capability list below cannot answer on its own, because it enumerates the
 * maximum surface rather than any one grant. One card per OAuth grant the
 * *signed-in* owner holds (`listGrants` is per-user, not platform-wide), each
 * showing how many of the platform's tools that connection actually reaches
 * and, when the grant predates a capability, exactly what a reconnect would
 * add (`grantHealth`, `L2-MCP-65`).
 */
export function ConnectionsSection({ grants }: { grants: GrantWithHealth[] }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-1">
        <SectionLabel>Your connections</SectionLabel>
        <p className="text-xs text-muted-foreground">
          The OAuth grants tied to your own signed-in account — not every
          user&rsquo;s connections, just yours.
        </p>
      </div>
      {grants.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing is connected yet. Create a client under{" "}
          <Link
            href="/backflip/settings/integrations"
            className="font-medium text-primary hover:underline"
          >
            Settings
          </Link>{" "}
          to let a Claude client connect.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {grants.map(({ grant, health }) => (
            <ConnectionCard
              key={grant.clientId}
              grant={grant}
              health={health}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ConnectionCard({
  grant,
  health,
}: {
  grant: OAuthGrant
  health: GrantHealth
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        health.stale
          ? "border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20"
          : "bg-background"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{grant.clientName}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Sees {health.visibleTools.length} of {TOOL_DEFS.length} tools
          </div>
        </div>
        {health.stale ? (
          <Badge className="border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Missing newer capabilities
          </Badge>
        ) : null}
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Connected {DATE_FMT.format(grant.connectedAt)}
        <span className="text-muted-foreground/50"> · </span>
        Last used{" "}
        {grant.lastUsedAt ? DATE_FMT.format(grant.lastUsedAt) : "never"}
      </div>

      {health.stale ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-amber-200 pt-3 text-xs dark:border-amber-900/60">
          <div>
            <span className="font-medium text-amber-800 dark:text-amber-300">
              Missing:{" "}
            </span>
            <span className="text-muted-foreground">
              {health.missing.map((m) => m.label).join(", ")}
            </span>
          </div>
          <p className="text-muted-foreground">
            A token&rsquo;s scopes are fixed when it is approved, so a
            connection made before a capability existed keeps the narrower set
            until it reconnects. Disconnect it under Account &rarr; Connected
            apps, then reconnect to pick up the rest.
          </p>
          <div>
            <span className="font-medium text-amber-800 dark:text-amber-300">
              Reconnecting unlocks:{" "}
            </span>
            <span className="text-muted-foreground">
              {health.unlockedByReconnect.join(", ")}
            </span>
          </div>
          <Link
            href="/backflip/account"
            className="inline-flex w-fit items-center gap-1 font-medium text-primary hover:underline"
          >
            Go to Account &rarr; Connected apps
            <RiArrowRightLine className="size-3.5" />
          </Link>
        </div>
      ) : null}
    </div>
  )
}
