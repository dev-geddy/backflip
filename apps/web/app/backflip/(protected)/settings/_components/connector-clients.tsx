"use client"

import { useActionState, useEffect, useState, useTransition } from "react"

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
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Textarea } from "@workspace/ui/components/textarea"
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react"

import {
  createConnectorClient,
  deleteConnectorClient,
  type CreateClientState,
} from "../_actions"
import type { ConnectorClientRow } from "./connectors-integration"

/** Client table + create-client dialog (`L2-MCP-50`). */
export function ConnectorClients({
  clients,
}: {
  clients: ConnectorClientRow[]
}) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold">Clients</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            OAuth clients allowed to connect to this platform through the MCP
            connector.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <RiAddLine />
          Add client
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          No clients yet. Add one before connecting from Claude.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Client ID</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Redirect URIs</TableHead>
                <TableHead>Loopback</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="w-9" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <ClientRow key={client.id} client={client} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateClientDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

function ClientRow({ client }: { client: ConnectorClientRow }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, startRemove] = useTransition()

  function handleDelete() {
    startRemove(async () => {
      const res = await deleteConnectorClient(client.id)
      if (res?.ok) {
        toast.success(res.message)
        setConfirmOpen(false)
      } else {
        toast.error(res?.message ?? "Couldn't delete client.")
      }
    })
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{client.clientName}</TableCell>
      <TableCell className="font-mono">{client.clientId}</TableCell>
      <TableCell>
        <Badge variant={client.origin === "manual" ? "default" : "secondary"}>
          {client.origin === "manual" ? "Manual" : "Dynamic"}
        </Badge>
      </TableCell>
      <TableCell className="max-w-56">
        <div className="flex flex-col gap-0.5">
          {client.redirectUris.map((uri) => (
            <span
              key={uri}
              className="truncate font-mono text-[11px] text-muted-foreground"
              title={uri}
            >
              {uri}
            </span>
          ))}
        </div>
      </TableCell>
      <TableCell>{client.allowLoopbackPorts ? "Any port" : "—"}</TableCell>
      <TableCell className="text-muted-foreground">
        {client.createdAt}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {client.lastUsedAt ?? "Never"}
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-destructive hover:text-destructive"
          aria-label={`Delete ${client.clientName}`}
          onClick={() => setConfirmOpen(true)}
        >
          <RiDeleteBinLine className="size-4" />
        </Button>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {client.clientName}?</AlertDialogTitle>
              <AlertDialogDescription>
                This immediately revokes the client&rsquo;s ability to connect
                and signs out anyone currently using it. This can&rsquo;t be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleDelete()
                }}
                disabled={removing}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {removing ? "Deleting…" : "Delete client"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

/* --------------------------- Create client dialog ------------------------- */

type Reveal = {
  clientId: string
  clientName: string
  clientSecret: string | null
}

function CreateClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [reveal, setReveal] = useState<Reveal | null>(null)

  // Closing the dialog — however it happens — wipes the secret from memory
  // for good. It is never retrievable after this.
  function close(nextOpen: boolean) {
    if (!nextOpen) setReveal(null)
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        {reveal ? (
          <SecretReveal reveal={reveal} onDone={() => close(false)} />
        ) : (
          <CreateClientForm
            onCreated={setReveal}
            onCancel={() => close(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CreateClientForm({
  onCreated,
  onCancel,
}: {
  onCreated: (reveal: Reveal) => void
  onCancel: () => void
}) {
  const [state, action, pending] = useActionState<CreateClientState, FormData>(
    createConnectorClient,
    null
  )

  useEffect(() => {
    if (state?.ok) {
      onCreated({
        clientId: state.client.clientId,
        clientName: state.client.clientName,
        clientSecret: state.clientSecret,
      })
    }
  }, [state, onCreated])

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add client</DialogTitle>
        <DialogDescription>
          Create a manual OAuth client. You&rsquo;ll get a client ID — and
          usually a secret — to paste into Claude&rsquo;s Advanced settings.
        </DialogDescription>
      </DialogHeader>

      <form action={action} className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="client-name">Name</FieldLabel>
          <Input
            id="client-name"
            name="clientName"
            autoComplete="off"
            required
            placeholder="Claude Desktop"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-redirects">Redirect URIs</FieldLabel>
          <Textarea
            id="client-redirects"
            name="redirectUris"
            rows={3}
            required
            placeholder={"https://claude.ai/api/mcp/auth_callback"}
            className="font-mono text-xs"
          />
          <FieldDescription>
            One per line. Must match exactly what the client sends.
          </FieldDescription>
        </Field>

        <label className="flex items-start gap-3">
          <Checkbox
            name="allowLoopbackPorts"
            defaultChecked={false}
            className="mt-0.5"
          />
          <span className="text-sm">
            <span className="block font-medium">
              Native client (Claude Code) — allow any loopback port
            </span>
            <span className="block text-xs text-muted-foreground">
              Claude Code redirects to a different random localhost port each
              time, so matching ignores the port only; a native client also gets
              no secret, since it can&rsquo;t keep one safe — PKCE protects it
              instead.
            </span>
          </span>
        </label>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create client"}
          </Button>
        </DialogFooter>
        {state && !state.ok ? (
          <span className="text-sm text-destructive">{state.message}</span>
        ) : null}
      </form>
    </>
  )
}

/* ------------------------------ Secret reveal ------------------------------ */

function SecretReveal({
  reveal,
  onDone,
}: {
  reveal: Reveal
  onDone: () => void
}) {
  const [acknowledged, setAcknowledged] = useState(false)
  const hasSecret = reveal.clientSecret != null

  return (
    <>
      <DialogHeader>
        <DialogTitle>{reveal.clientName} created</DialogTitle>
        <DialogDescription>
          {hasSecret
            ? "Save the client ID and secret now — the secret is shown once and can never be retrieved again."
            : "Save the client ID now. Native clients get no secret — PKCE protects the connection instead."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
          <div className="text-xs font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-300">
            {hasSecret
              ? "Copy both before closing this dialog"
              : "Copy this before closing this dialog"}
          </div>

          <div className="mt-3 flex flex-col gap-3">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">
                Client ID
              </div>
              <code className="mt-1 block rounded-md border bg-card px-2.5 py-2 font-mono text-xs break-all select-all">
                {reveal.clientId}
              </code>
            </div>

            {hasSecret ? (
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">
                  Client secret
                </div>
                <code className="mt-1 block rounded-md border bg-card px-2.5 py-2 font-mono text-xs break-all select-all">
                  {reveal.clientSecret}
                </code>
              </div>
            ) : (
              <p className="text-xs text-amber-800 dark:text-amber-300">
                No secret for native clients — that&rsquo;s expected, not a
                failure.
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          In Claude, go to{" "}
          <span className="font-medium text-foreground">
            Add custom connector → Advanced settings
          </span>{" "}
          and paste {hasSecret ? "both values" : "the client ID"} in.
        </p>

        <label className="flex items-start gap-2.5 text-xs">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
            className="mt-0.5"
          />
          <span>
            I&rsquo;ve saved{" "}
            {hasSecret ? "the client ID and secret" : "the client ID"} — I
            understand {hasSecret ? "the secret" : "it"} won&rsquo;t be shown
            again.
          </span>
        </label>
      </div>

      <DialogFooter>
        <Button type="button" disabled={!acknowledged} onClick={onDone}>
          Done — close
        </Button>
      </DialogFooter>
    </>
  )
}
