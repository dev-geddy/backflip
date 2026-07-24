import { accounts, db, users } from "@workspace/db"
import { Badge } from "@workspace/ui/components/badge"
import { Card } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { eq } from "drizzle-orm"

import { requireCapability } from "@/app/_lib/auth/guard"
import { ROLE_LABELS } from "@/app/_lib/auth/permissions"
import { AccountEmailSection } from "./_components/email-section"
import { PasswordSection } from "./_components/password-section"
import { ProfileSection } from "./_components/profile-section"

/** OAuth provider id → display label. */
const PROVIDER_LABELS: Record<string, string> = { google: "Google" }

/**
 * /backflip/account — the signed-in user's own area (all roles, capability
 * `account`). Self-service Profile (name), Email (verified change), and
 * Password (change/set) sections, plus a read-only Login methods summary.
 * The `passwordHash` is read only to derive a boolean — never sent to client.
 */
export default async function AccountPage() {
  const sessionUser = await requireCapability("account")

  const [row] = await db
    .select({
      name: users.name,
      email: users.email,
      role: users.role,
      passwordHash: users.passwordHash,
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
          <ProfileSection name={row?.name ?? null} />
          <Separator />
          <AccountEmailSection
            email={row?.email ?? ""}
            hasPassword={Boolean(row?.passwordHash)}
          />
        </section>
      </Card>

      <Card className="p-6">
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Password</h2>
          <PasswordSection hasPassword={Boolean(row?.passwordHash)} />
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
