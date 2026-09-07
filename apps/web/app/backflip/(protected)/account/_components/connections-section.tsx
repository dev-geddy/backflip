import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import type { Role } from "@/app/_lib/auth/permissions"
import { grantHealth } from "@/app/_lib/oauth/grant-health"
import { SCOPE_LABELS } from "@/app/_lib/oauth/scopes"
import type { OAuthGrant } from "@/app/_lib/oauth/types"
import { disconnectConnection } from "../../connect/_actions"
import { SectionLabel } from "../../_components/page-heading"

const DATE_FMT = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })

/** How many gained tool names to name before folding the rest into "+N more". */
const UNLOCKED_TOOLS_SHOWN = 4

/** Plain-language scope summary — `SCOPE_LABELS` titles, not the wire form. */
function scopeSummary(scopes: OAuthGrant["scopes"]) {
  return scopes.map((s) => SCOPE_LABELS[s].title).join(", ")
}

/** Cap a tool-name list at `UNLOCKED_TOOLS_SHOWN`, folding the rest into "+N more". */
function formatToolNames(names: string[]) {
  if (names.length <= UNLOCKED_TOOLS_SHOWN) return names
  const shown = names.slice(0, UNLOCKED_TOOLS_SHOWN)
  return [...shown, `+${names.length - shown.length} more`]
}

/**
 * Connected-clients section (`L2-MCP-17`) — the user's standing OAuth grants:
 * client name, granted scopes in plain language, connected date, last used.
 * Each row has a Disconnect action, always scoped server-side to the signed-in
 * user (`connect/_actions.ts#disconnectConnection`, `L2-AUTH-27`). Presentation
 * only — `grants` is fetched by the page (`isMcpEnabled` gates whether this is
 * mounted at all, `L2-MCP-37`); `role` is the signed-in user's own, passed down
 * rather than re-read here, so `grantHealth` can tell a healthy grant from a
 * stale one (`L2-MCP-65`).
 *
 * A grant's scopes are frozen at consent time, so a connection made before the
 * deployment gained a capability quietly keeps the narrower set — from the
 * outside indistinguishable from "the server doesn't have those tools" (see
 * `grant-health.ts`). A stale row here says so plainly, names what it is
 * missing, and points at the Disconnect button already in the row as the fix.
 *
 * @spec L2-MCP-65
 */
export function ConnectionsSection({
  grants,
  role,
}: {
  grants: OAuthGrant[]
  role: Role
}) {
  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>Connected apps</SectionLabel>
      <div className="rounded-xl border bg-card">
        {grants.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No connectors are linked. A connector is a third-party app — like
            Claude — that you’ve authorized to access your account through the
            Backflip API.
          </div>
        ) : (
          grants.map((grant, i) => {
            const health = grantHealth(grant.scopes, role)
            const totalTools =
              health.visibleTools.length + health.unlockedByReconnect.length

            return (
              <div
                key={grant.clientId}
                className={cn(
                  "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between",
                  i !== grants.length - 1 && "border-b"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-medium">
                      {grant.clientName}
                    </div>
                    {health.stale ? (
                      <Badge className="border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        Missing newer capabilities
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {scopeSummary(grant.scopes)}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Sees {health.visibleTools.length} of {totalTools} tools
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Connected {DATE_FMT.format(grant.connectedAt)}
                    <span className="text-muted-foreground/50"> · </span>
                    Last used{" "}
                    {grant.lastUsedAt
                      ? DATE_FMT.format(grant.lastUsedAt)
                      : "never"}
                  </div>

                  {health.stale ? (
                    <div className="mt-2 flex flex-col gap-1.5 border-t border-amber-200 pt-2 text-xs dark:border-amber-900/60">
                      <div>
                        <span className="font-medium text-amber-800 dark:text-amber-300">
                          Missing:{" "}
                        </span>
                        <span className="text-muted-foreground">
                          {health.missing.map((m) => m.label).join(", ")}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        This connection was approved before those capabilities
                        existed, so it keeps its original set until it is
                        reconnected. Disconnect, then reconnect from the app.
                      </p>
                      {health.unlockedByReconnect.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-medium text-amber-800 dark:text-amber-300">
                            Reconnecting unlocks:
                          </span>
                          {formatToolNames(health.unlockedByReconnect).map(
                            (name) => (
                              <code
                                key={name}
                                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                              >
                                {name}
                              </code>
                            )
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <form action={disconnectConnection} className="flex-none">
                  <input type="hidden" name="clientId" value={grant.clientId} />
                  <Button type="submit" variant="outline" size="sm">
                    Disconnect
                  </Button>
                </form>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
