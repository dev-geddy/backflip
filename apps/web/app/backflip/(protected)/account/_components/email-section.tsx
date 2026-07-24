"use client"

import { useActionState, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldDescription, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { requestEmailChange } from "../_actions"

/**
 * Email section. Summary shows the current login email; the edit form requests
 * a change, which sends a verification link to the NEW address. The address is
 * only swapped once that link is confirmed — so we keep the pending message
 * visible on success rather than collapsing immediately.
 */
export function AccountEmailSection({
  email,
  hasPassword,
}: {
  email: string
  hasPassword: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState(requestEmailChange, null)

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm">
          <span className="font-medium">Email</span>
          <span className="ml-3 font-mono text-muted-foreground">{email}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Change email
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="flex max-w-sm flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="new-email">New email</FieldLabel>
        <Input
          id="new-email"
          name="newEmail"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <FieldDescription>
          We’ll send a confirmation link to the new address. Your email won’t
          change until you open it.
        </FieldDescription>
      </Field>
      {hasPassword ? (
        <Field>
          <FieldLabel htmlFor="email-current-password">
            Current password
          </FieldLabel>
          <Input
            id="email-current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
          <FieldDescription>
            Confirm it’s you before changing your sign-in email.
          </FieldDescription>
        </Field>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send confirmation"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => setEditing(false)}
        >
          Cancel
        </Button>
      </div>
      {state ? (
        <span
          className={
            state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"
          }
        >
          {state.message}
        </span>
      ) : null}
    </form>
  )
}
