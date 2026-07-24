"use client"

import { useActionState, useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { ROLES, ROLE_LABELS, type Role } from "@/app/_lib/auth/permissions"
import { updateUser } from "../_actions"

export type EditableUser = {
  id: string
  name: string | null
  email: string
  role: Role
}

/**
 * Owner-only edit surface for a single user (name + email + role). Opens a
 * dialog from the row's Edit button; submits via the `updateUser` server
 * action (same `useActionState` pattern as the settings forms). `isSelf`
 * disables the role field — an owner can't change their own role.
 */
export function EditUserDialog({
  user,
  isSelf,
}: {
  user: EditableUser
  isSelf: boolean
}) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(updateUser, null)

  useEffect(() => {
    if (state?.ok) setOpen(false)
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Edit
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update the display name, login email, and platform role.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={user.id} />

          <Field>
            <FieldLabel htmlFor="edit-user-name">Name</FieldLabel>
            <Input
              id="edit-user-name"
              name="name"
              autoComplete="off"
              placeholder="No name set"
              defaultValue={user.name ?? ""}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-user-email">Email</FieldLabel>
            <Input
              id="edit-user-email"
              name="email"
              type="email"
              autoComplete="off"
              required
              defaultValue={user.email}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-user-role">Role</FieldLabel>
            {/* Disabled inputs don't submit; when self-editing, carry the
                unchanged role via a hidden field so the action still gets it. */}
            {isSelf ? (
              <input type="hidden" name="role" value={user.role} />
            ) : null}
            <Select
              name={isSelf ? undefined : "role"}
              defaultValue={user.role}
              disabled={isSelf}
            >
              <SelectTrigger id="edit-user-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf ? (
              <p className="text-xs text-muted-foreground">
                You can&rsquo;t change your own role.
              </p>
            ) : null}
          </Field>

          <DialogFooter className="items-center gap-3">
            {state && !state.ok ? (
              <span className="mr-auto text-sm text-destructive">
                {state.message}
              </span>
            ) : null}
            <DialogClose
              render={
                <Button type="button" variant="ghost" disabled={pending}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
