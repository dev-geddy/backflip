import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"

import {
  canEditUsers,
  ROLE_LABELS,
  type Role,
} from "@/app/_lib/auth/permissions"
import { PageHeading } from "../../_components/page-heading"
import { AddUserDialog } from "./add-user-dialog"
import { EditUserDialog } from "./edit-user-dialog"

export type UserRow = {
  id: string
  name: string | null
  email: string
  image: string | null
  role: Role
  /** Human-readable auth methods, e.g. ["Password", "Google"]. */
  loginMethods: string[]
}

function initials(value: string) {
  return value.slice(0, 2).toUpperCase()
}

/**
 * Admin user list — flat details card. Header row (title + add action) over a
 * bordered list with hairline row dividers. Each row: avatar · name + mono
 * email · role + login method · Edit (owner only). Editing is gated by
 * `sessionRole` here AND re-checked in `updateUser`.
 */
export function UsersList({
  users,
  sessionRole,
  sessionUserId,
}: {
  users: UserRow[]
  sessionRole?: Role
  sessionUserId?: string
}) {
  const editable = canEditUsers(sessionRole)

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeading
        title="Users"
        description="Everyone with platform access"
        action={editable ? <AddUserDialog /> : undefined}
      />

      <div className="rounded-xl border bg-card">
        <ul className="divide-y">
          {users.map((u) => {
            const label = u.name || u.email
            const methods = u.loginMethods.length
              ? u.loginMethods.join(", ")
              : "No login method"
            return (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="size-10 rounded-full">
                  {u.image ? <AvatarImage src={u.image} alt={label} /> : null}
                  <AvatarFallback className="rounded-full text-xs">
                    {initials(label)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="truncate text-sm font-medium">
                      {label}
                    </span>
                    {u.name ? (
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {u.email}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ROLE_LABELS[u.role]} · {methods}
                  </p>
                </div>

                <Badge variant="secondary" className="flex-none">
                  {ROLE_LABELS[u.role]}
                </Badge>

                {editable ? (
                  <EditUserDialog
                    user={{
                      id: u.id,
                      name: u.name,
                      email: u.email,
                      role: u.role,
                    }}
                    isSelf={u.id === sessionUserId}
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
