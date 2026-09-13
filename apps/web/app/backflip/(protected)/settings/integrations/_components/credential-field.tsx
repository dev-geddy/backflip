"use client"

import { useState, useTransition } from "react"

import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { RiDeleteBinLine, RiLock2Line } from "@remixicon/react"

import { clearIntegrationKey } from "../_actions"
import type { CredentialTarget } from "../_lib/credentials"

/**
 * One integration credential — the same block for every provider on the page.
 *
 * A stored key is **not an editable input**. It renders as a read-only masked
 * row with two explicit acts beside it: `Replace`, which opens an empty field,
 * and `Remove`, which clears the key after a confirmation. The old shape —
 * one always-editable field whose placeholder read "leave blank to keep" —
 * asked the operator to understand that an empty box meant "keep", made an
 * accidental keystroke a silent overwrite of a working credential, and offered
 * no way at all to take a key back out.
 *
 * While the key is stored and not being replaced, no input is rendered, so the
 * form submits no key field and the server's keep-on-blank rule holds without
 * the operator having to know about it.
 *
 * @spec L2-AI-23
 */
export function CredentialField({
  id,
  name,
  label,
  preview,
  placeholder,
  description,
  target,
  serviceName,
  removalNote,
  required,
}: {
  id: string
  /** Form field name — `apiKey`, `apiToken`, … matched by the save action. */
  name: string
  label: string
  /** Masked preview of the stored key, or null when nothing is stored. */
  preview: string | null
  placeholder: string
  description?: React.ReactNode
  /**
   * Which stored credential `Remove` clears. Omitted where removal is not a
   * thing of its own — a Slack app's token goes when the app row is deleted
   * (`L2-SLACK-05`), so that field offers `Replace` alone.
   */
  target?: CredentialTarget
  /** Human name of the service, used in the confirmation copy. */
  serviceName: string
  /** What else stops working when the key goes, one clause. */
  removalNote?: string
  /** Mark the input required — only meaningful while nothing is stored. */
  required?: boolean
}) {
  const [replacing, setReplacing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, startRemove] = useTransition()

  function handleRemove() {
    if (!target) return
    startRemove(async () => {
      const res = await clearIntegrationKey(target)
      if (res?.ok) {
        toast.success(`${serviceName} key removed.`)
        setConfirmOpen(false)
        setReplacing(false)
      } else {
        toast.error(res?.message ?? "Couldn't remove the key.")
      }
    })
  }

  const stored = Boolean(preview)

  return (
    <Field>
      <FieldLabel htmlFor={stored && !replacing ? undefined : id}>
        {label}
      </FieldLabel>

      {stored && !replacing ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <RiLock2Line
            className="size-4 flex-none text-muted-foreground"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate font-mono text-xs">
            {preview}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReplacing(true)}
          >
            Replace
          </Button>
          {target ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <RiDeleteBinLine />
              Remove
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          {/* type="text" + CSS masking, NOT type="password": a password input
              makes Chrome treat the form as a login form and prefill saved
              admin credentials into it. */}
          <Input
            id={id}
            name={name}
            type="text"
            autoComplete="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            autoFocus={replacing}
            required={required && !replacing}
            className="[-webkit-text-security:disc]"
            placeholder={placeholder}
          />
          {replacing ? (
            <FieldDescription>
              Saving replaces the stored key.{" "}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => setReplacing(false)}
              >
                Keep the current key
              </button>
            </FieldDescription>
          ) : null}
        </>
      )}

      {description ? <FieldDescription>{description}</FieldDescription> : null}

      {target ? (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove the {serviceName} key?</AlertDialogTitle>
              <AlertDialogDescription>
                The stored key is deleted and {serviceName} is switched off
                {removalNote ? `, so ${removalNote}` : ""}. Other settings on
                this page are kept. This can&apos;t be undone — reconnecting
                means pasting a new key.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleRemove()
                }}
                disabled={removing}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {removing ? "Removing…" : "Remove key"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </Field>
  )
}
