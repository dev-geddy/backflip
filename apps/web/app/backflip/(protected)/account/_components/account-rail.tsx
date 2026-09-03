import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import { SectionLabel } from "../../_components/page-heading"
import { VerifiedTick } from "./verified-tick"

/**
 * Account security rail (design 4a) — real data only: email verification state
 * + linked sign-in methods, plus a static "why verify twice" explainer.
 * Two-factor / last-sign-in / session list / danger-zone are omitted (no
 * backend today). `connectionsCount` is omitted entirely when the connector is
 * disabled (`L2-MCP-37`) — the page passes `undefined` in that case.
 */
export function AccountRail({
  emailVerified,
  loginMethods,
  connectionsCount,
}: {
  emailVerified: boolean
  loginMethods: string[]
  connectionsCount?: number
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3">
        <SectionLabel>Account security</SectionLabel>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm text-muted-foreground">Email</span>
            {emailVerified ? (
              <VerifiedTick />
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                Unverified
              </span>
            )}
          </div>
          <div
            className={cn(
              "flex items-start justify-between gap-3 pt-3",
              connectionsCount !== undefined && "border-b pb-3"
            )}
          >
            <span className="text-sm text-muted-foreground">Sign-in</span>
            <div className="flex flex-wrap justify-end gap-1.5">
              {loginMethods.length ? (
                loginMethods.map((m) => (
                  <Badge key={m} variant="outline">
                    {m}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  No method on file
                </span>
              )}
            </div>
          </div>
          {connectionsCount !== undefined ? (
            <div className="flex items-center justify-between pt-3">
              <span className="text-sm text-muted-foreground">
                Connected apps
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {connectionsCount > 0
                  ? `${connectionsCount} connected`
                  : "None"}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex gap-3 rounded-xl border bg-card p-4">
        <div className="flex size-7 flex-none items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          i
        </div>
        <div>
          <div className="text-sm font-medium">Why verify twice?</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Confirming your current password blocks hijacking; verifying the new
            address by email link proves you own it.
          </p>
        </div>
      </div>
    </div>
  )
}
