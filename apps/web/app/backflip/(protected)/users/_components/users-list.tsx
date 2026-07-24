import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import {
  canEditUsers,
  ROLE_LABELS,
  type Role,
} from "@/app/_lib/auth/permissions"
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
 * Admin user list — vertically stacked, compact wide cards. Each row: avatar ·
 * name + email · (role · login method, smaller font) · Edit (owner only).
 * Editing is gated by `sessionRole` here AND re-checked in `updateUser`.
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
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Everyone with platform access</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {users.map((u) => {
            const label = u.name || u.email
            const methods = u.loginMethods.length
              ? u.loginMethods.join(", ")
              : "No login method"
            return (
              <li key={u.id} className="flex items-center gap-3 py-3">
                <Avatar className="size-10 rounded-lg">
                  {u.image ? <AvatarImage src={u.image} alt={label} /> : null}
                  <AvatarFallback className="rounded-lg text-xs">
                    {initials(label)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="truncate font-medium">{label}</span>
                    {u.name ? (
                      <span className="truncate text-sm text-muted-foreground">
                        {u.email}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[u.role]} · {methods}
                  </p>
                </div>

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
      </CardContent>
    </Card>
  )
}
