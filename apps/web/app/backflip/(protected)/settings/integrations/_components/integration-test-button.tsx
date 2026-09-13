"use client"

import { useTransition } from "react"

import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

import type { SaveState } from "../_actions"

/**
 * "Test connection" button shared by the integration panes that probe a live
 * service. Runs the given action, toasts its result. Never renders the
 * credential — the action returns a message only.
 */
export function IntegrationTestButton({
  action,
  label = "Test connection",
  pendingLabel = "Testing…",
  disabled,
}: {
  action: () => Promise<SaveState>
  label?: string
  pendingLabel?: string
  disabled?: boolean
}) {
  const [pending, start] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending || disabled}
      onClick={() =>
        start(async () => {
          const res = await action()
          if (res?.ok) toast.success(res.message)
          else toast.error(res?.message ?? "Test failed.")
        })
      }
    >
      {pending ? pendingLabel : label}
    </Button>
  )
}
