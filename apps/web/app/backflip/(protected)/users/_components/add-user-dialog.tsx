"use client"

import { useActionState, useEffect, useRef, useState } from "react"

import { RiAddLine } from "@remixicon/react"
import { toast } from "sonner"

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
import { Field, FieldDescription, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { ROLES, ROLE_LABELS } from "@/app/_lib/auth/permissions"
import { createUser } from "../_actions"

/**
 * Owner-only "Add user" surface. Opens a dialog, submits via the `createUser`
 * server action (same `useActionState` pattern as the edit dialog). On success
 * the returned message — which reports welcome-email status, including the
 * "email not configured" info case — is surfaced via a toast, and the dialog
 * closes and resets. Gated in the UI by the caller AND re-checked server-side.
 */
export function AddUserDialog() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(createUser, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message)
      formRef.current?.reset()
      setOpen(false)
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <RiAddLine className="size-4" />
            Add user
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create a platform account. They&rsquo;ll receive a welcome email if
            email sending is configured.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={action} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="add-user-name">Name</FieldLabel>
            <Input
              id="add-user-name"
              name="name"
              autoComplete="off"
              placeholder="Optional"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="add-user-email">Email</FieldLabel>
            <Input
              id="add-user-email"
              name="email"
              type="email"
              autoComplete="off"
              required
              placeholder="person@example.com"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="add-user-role">Role</FieldLabel>
            <Select name="role" defaultValue="teammate">
              <SelectTrigger id="add-user-role" className="w-full">
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
          </Field>

          <Field>
            <FieldLabel htmlFor="add-user-password">Password</FieldLabel>
            <Input
              id="add-user-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Optional"
            />
            <FieldDescription>
              Leave blank for Google-only sign-in (the email must be
              pre-registered to sign in with Google).
            </FieldDescription>
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
              {pending ? "Adding…" : "Add user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
