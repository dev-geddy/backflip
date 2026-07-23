import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

export type UserRow = {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  createdAt: Date
}

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
}

function initials(value: string) {
  return value.slice(0, 2).toUpperCase()
}

export function UsersTable({ users }: { users: UserRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Everyone with platform access</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const label = u.name || u.email
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7 rounded-lg">
                        {u.image ? (
                          <AvatarImage src={u.image} alt={label} />
                        ) : null}
                        <AvatarFallback className="rounded-lg text-xs">
                          {initials(label)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[u.role] ?? "outline"}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.createdAt.toLocaleDateString()}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
