"use client"

import { useActionState, useEffect, useState } from "react"

import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { changePassword } from "../_actions"

/**
 * Password section. Summary shows whether a password is set; edit form asks for
 * the current password (when one exists) plus the new password + confirmation.
 * On success a "password changed" email is sent server-side.
 */
export function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState(changePassword, null)

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message)
      setEditing(false)
    }
  }, [state])

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-4">
        {hasPassword ? (
          <Badge variant="secondary">Password set</Badge>
        ) : (
          <Badge variant="outline">No password</Badge>
        )}
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          {hasPassword ? "Change password" : "Set password"}
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="flex max-w-sm flex-col gap-4">
      {hasPassword ? (
        <Field>
          <FieldLabel htmlFor="current-password">Current password</FieldLabel>
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
      ) : null}
      <Field>
        <FieldLabel htmlFor="new-password">New password</FieldLabel>
        <Input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => setEditing(false)}
        >
          Cancel
        </Button>
        {state && !state.ok ? (
          <span className="text-sm text-destructive">{state.message}</span>
        ) : null}
      </div>
    </form>
  )
}
