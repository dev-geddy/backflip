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
import { Switch } from "@workspace/ui/components/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { RiAddLine, RiDeleteBinLine, RiPencilLine } from "@remixicon/react"

import { deleteSlackApp, saveSlackApp, testSlackApp } from "../_actions"
import { IntegrationTestButton } from "./integration-test-button"

/** One Slack app row — the bot token is only ever a masked preview here. */
export type SlackAppRow = {
  id: string
  name: string
  defaultChannel: string | null
  teamName: string | null
  appId: string | null
  enabled: boolean
  tokenPreview: string | null
  hasSigningSecret: boolean
  lastCheckedAt: string | null
}

/**
 * Slack apps (bot tokens) — add, edit, test and remove any number of them.
 *
 * @spec L2-SLACK-03
 */
export function SlackApps({ apps }: { apps: SlackAppRow[] }) {
  const [editing, setEditing] = useState<SlackAppRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold">Apps</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Slack apps installed in a workspace. Each holds its own bot token —
            add one per workspace.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <RiAddLine />
          Add app
        </Button>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          No apps yet. Add one with a bot token (xoxb-…) to post as your app.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Bot token</TableHead>
                <TableHead>Default channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last checked</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => (
                <AppRow key={app.id} app={app} onEdit={() => setEditing(app)} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AppDialog
        key={editing?.id ?? "create"}
        app={editing}
        open={createOpen || editing != null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            setEditing(null)
          }
        }}
      />
    </div>
  )
}

function AppRow({ app, onEdit }: { app: SlackAppRow; onEdit: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, startRemove] = useTransition()

  function handleDelete() {
    startRemove(async () => {
      const res = await deleteSlackApp(app.id)
      if (res?.ok) {
        toast.success(res.message)
        setConfirmOpen(false)
      } else {
        toast.error(res?.message ?? "Couldn't remove the app.")
      }
    })
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{app.name}</TableCell>
      <TableCell className="text-muted-foreground">
        {app.teamName ?? "—"}
      </TableCell>
      <TableCell className="font-mono text-[11px] text-muted-foreground">
        {app.tokenPreview ?? "Not set"}
      </TableCell>
      <TableCell className="font-mono text-[11px] text-muted-foreground">
        {app.defaultChannel ?? "—"}
      </TableCell>
      <TableCell>
        <Badge variant={app.enabled ? "default" : "secondary"}>
          {app.enabled ? "Enabled" : "Disabled"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {app.lastCheckedAt ?? "Never"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <IntegrationTestButton
            action={() => testSlackApp(app.id)}
            label="Test"
            pendingLabel="…"
            disabled={!app.tokenPreview}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Edit ${app.name}`}
            onClick={onEdit}
          >
            <RiPencilLine className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            aria-label={`Remove ${app.name}`}
            onClick={() => setConfirmOpen(true)}
          >
            <RiDeleteBinLine className="size-4" />
          </Button>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {app.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                The stored bot token is deleted. Anything configured to post
                through this app stops working. This can&rsquo;t be undone.
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
                {removing ? "Removing…" : "Remove app"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

/** Add/edit dialog. `app: null` = create; editing keeps blank secrets as-is. */
function AppDialog({
  app,
  open,
  onOpenChange,
}: {
  app: SlackAppRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [state, action, pending] = useActionState(saveSlackApp, null)

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message)
      onOpenChange(false)
    }
  }, [state, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {app ? `Edit ${app.name}` : "Add Slack app"}
          </DialogTitle>
          <DialogDescription>
            {app
              ? "Leave a secret field blank to keep the stored value."
              : "Paste the bot token from your Slack app’s OAuth & Permissions page."}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          {app ? <input type="hidden" name="id" value={app.id} /> : null}

          <Field>
            <FieldLabel htmlFor="slack-app-name">Name</FieldLabel>
            <Input
              id="slack-app-name"
              name="name"
              autoComplete="off"
              required
              placeholder="Acme workspace"
              defaultValue={app?.name ?? ""}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="slack-app-token">Bot token</FieldLabel>
            <Input
              id="slack-app-token"
              name="botToken"
              type="text"
              autoComplete="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              className="font-mono [-webkit-text-security:disc]"
              required={!app}
              placeholder={
                app?.tokenPreview
                  ? `${app.tokenPreview} — leave blank to keep`
                  : "xoxb-…"
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="slack-app-signing">
              Signing secret{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id="slack-app-signing"
              name="signingSecret"
              type="text"
              autoComplete="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              className="font-mono [-webkit-text-security:disc]"
              placeholder={
                app?.hasSigningSecret
                  ? "Stored — leave blank to keep"
                  : "Needed only to verify inbound Slack requests"
              }
            />
            <FieldDescription>
              Used to verify requests Slack sends here. Nothing consumes it yet.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="slack-app-channel">
              Default channel{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id="slack-app-channel"
              name="defaultChannel"
              autoComplete="off"
              className="font-mono"
              placeholder="#general"
              defaultValue={app?.defaultChannel ?? ""}
            />
          </Field>

          <label className="flex items-center gap-2">
            <Switch name="enabled" defaultChecked={app?.enabled ?? true} />
            <span className="text-sm">Enabled</span>
          </label>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : app ? "Save app" : "Add app"}
            </Button>
          </DialogFooter>
          {state && !state.ok ? (
            <span className="text-sm text-destructive">{state.message}</span>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}
