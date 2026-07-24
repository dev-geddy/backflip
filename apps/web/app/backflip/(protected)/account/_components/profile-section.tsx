"use client"

import { useActionState, useEffect, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { saveProfile } from "../_actions"

/** Profile section: display name, self-service. Summary → inline edit form. */
export function ProfileSection({ name }: { name: string | null }) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState(saveProfile, null)

  useEffect(() => {
    if (state?.ok) setEditing(false)
  }, [state])

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm">
          <span className="font-medium">Name</span>
          <span className="ml-3 text-muted-foreground">
            {name || <span className="italic">not set</span>}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="flex max-w-sm flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="account-name">Name</FieldLabel>
        <Input
          id="account-name"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          defaultValue={name ?? ""}
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
