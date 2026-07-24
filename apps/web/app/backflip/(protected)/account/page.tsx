import { accounts, db, users } from "@workspace/db"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { eq } from "drizzle-orm"

import { requireCapability } from "@/app/_lib/auth/guard"
import { ROLE_LABELS } from "@/app/_lib/auth/permissions"
import { PageHeading, SectionLabel } from "../_components/page-heading"
import { AccountRail } from "./_components/account-rail"
import { AccountEmailSection } from "./_components/email-section"
import { PasswordSection } from "./_components/password-section"
import { ProfileSection } from "./_components/profile-section"

/** OAuth provider id → display label. */
const PROVIDER_LABELS: Record<string, string> = { google: "Google" }

function initials(value: string) {
  return value.slice(0, 2).toUpperCase()
}

/**
 * /backflip/account — the signed-in user's own area (all roles, capability
 * `account`). Two-column: self-service Profile / Email / Password details on
 * the left, a security context rail on the right. The `passwordHash` is read
 * only to derive a boolean — never sent to client.
 */
export default async function AccountPage() {
  const sessionUser = await requireCapability("account")

  const [row] = await db
    .select({
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      emailVerified: users.emailVerified,
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

  const label = row?.name || row?.email || "Account"
  const emailVerified = Boolean(row?.emailVerified)

  return (
    <div className="flex h-full min-h-0 flex-col bg-card lg:flex-row">
      {/* Main */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[680px] flex-col gap-6 p-6 lg:p-8">
          <PageHeading
            title="My account"
            description="Your personal profile and sign-in credentials."
          />
          {/* Profile summary */}
          <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
            <Avatar className="size-13 rounded-full">
              {row?.image ? <AvatarImage src={row.image} alt={label} /> : null}
              <AvatarFallback className="rounded-full text-base">
                {initials(label)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold">
                {row?.name || "Unnamed"}
              </div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                {row?.email}
              </div>
            </div>
            {row?.role ? (
              <Badge variant="secondary">{ROLE_LABELS[row.role]}</Badge>
            ) : null}
          </div>

          {/* Account details — one bordered list, hairline row dividers */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Account details</SectionLabel>
            <div className="rounded-xl border bg-card">
              <div className="p-4">
                <ProfileSection name={row?.name ?? null} />
              </div>
              <div className="border-t p-4">
                <AccountEmailSection
                  email={row?.email ?? ""}
                  emailVerified={emailVerified}
                  hasPassword={Boolean(row?.passwordHash)}
                />
              </div>
              <div className="border-t p-4">
                <PasswordSection hasPassword={Boolean(row?.passwordHash)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security rail */}
      <div className="w-full flex-none overflow-y-auto border-t bg-muted/30 p-6 lg:w-80 lg:border-t-0 lg:border-l">
        <AccountRail emailVerified={emailVerified} loginMethods={loginMethods} />
      </div>
    </div>
  )
}
