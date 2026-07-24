import { accounts, db, users } from "@workspace/db"
import { Badge } from "@workspace/ui/components/badge"
import { Card } from "@workspace/ui/components/card"
import { eq } from "drizzle-orm"

import { requireCapability } from "@/app/_lib/auth/guard"
import { ROLE_LABELS } from "@/app/_lib/auth/permissions"

/** OAuth provider id → display label. */
const PROVIDER_LABELS: Record<string, string> = { google: "Google" }

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm">
      <dt className="font-medium">{label}</dt>
      <dd className="text-muted-foreground">
        {value ? value : <span className="italic">not set</span>}
      </dd>
    </div>
  )
}

/**
 * /backflip/account — the signed-in user's own area (all roles, capability
 * `account`). Read-only summary of profile + login methods. The summary →
 * click-to-edit flow (mirroring settings) is the planned next iteration; see
 * docs/notes/auth.md "Planned — Account page". Profile photo is out of scope.
 */
export default async function AccountPage() {
  const sessionUser = await requireCapability("account")

  const [row] = await db
    .select({
      name: users.name,
      email: users.email,
      role: users.role,
      passwordHash: users.passwordHash,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, sessionUser.id))

  const providerRows = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, sessionUser.id))

  const loginMethods: string[] = []
  if (row?.passwordHash) loginMethods.push("Password")
  for (const { provider } of providerRows) {
    loginMethods.push(PROVIDER_LABELS[provider] ?? provider)
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Card className="p-6">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Profile</h2>
            {row?.role ? (
              <Badge variant="secondary">{ROLE_LABELS[row.role]}</Badge>
            ) : null}
          </div>
          <dl className="flex flex-col divide-y">
            <Row label="Name" value={row?.name ?? null} />
            <Row label="Email" value={row?.email ?? null} />
            <Row
              label="Role"
              value={row?.role ? ROLE_LABELS[row.role] : null}
            />
          </dl>
        </section>
      </Card>

      <Card className="p-6">
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Login methods</h2>
          {loginMethods.length ? (
            <div className="flex flex-wrap gap-2">
              {loginMethods.map((m) => (
                <Badge key={m} variant="outline">
                  {m}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No login method on file.
            </p>
          )}
        </section>
      </Card>
    </div>
  )
}
