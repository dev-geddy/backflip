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

import {
  deleteSlackWebhook,
  saveSlackWebhook,
  testSlackWebhook,
} from "../_actions"
import { CredentialField } from "./credential-field"
import { IntegrationTestButton } from "./integration-test-button"

/** One incoming webhook — the URL is a credential, so only a preview here. */
export type SlackWebhookRow = {
  id: string
  label: string
  channel: string | null
  enabled: boolean
  urlPreview: string | null
  lastCheckedAt: string | null
}

/**
 * Slack incoming webhooks — add, edit, send a test message, remove. Any
 * number of them; each URL posts to the one channel Slack bound it to.
 *
 * @spec L2-SLACK-04
 */
export function SlackWebhooks({ webhooks }: { webhooks: SlackWebhookRow[] }) {
  const [editing, setEditing] = useState<SlackWebhookRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold">Incoming webhooks</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Post-only URLs, one per channel. Testing one really does deliver a
            message to that channel.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <RiAddLine />
          Add webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          No webhooks yet. Add a hooks.slack.com URL to post into a channel.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last tested</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <WebhookRow
                  key={webhook.id}
                  webhook={webhook}
                  onEdit={() => setEditing(webhook)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <WebhookDialog
        key={editing?.id ?? "create"}
        webhook={editing}
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

function WebhookRow({
  webhook,
  onEdit,
}: {
  webhook: SlackWebhookRow
  onEdit: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, startRemove] = useTransition()

  function handleDelete() {
    startRemove(async () => {
      const res = await deleteSlackWebhook(webhook.id)
      if (res?.ok) {
        toast.success(res.message)
        setConfirmOpen(false)
      } else {
        toast.error(res?.message ?? "Couldn't remove the webhook.")
      }
    })
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{webhook.label}</TableCell>
      <TableCell className="font-mono text-[11px] text-muted-foreground">
        {webhook.urlPreview ?? "Not set"}
      </TableCell>
      <TableCell className="font-mono text-[11px] text-muted-foreground">
        {webhook.channel ?? "—"}
      </TableCell>
      <TableCell>
        <Badge variant={webhook.enabled ? "default" : "secondary"}>
          {webhook.enabled ? "Enabled" : "Disabled"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {webhook.lastCheckedAt ?? "Never"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <IntegrationTestButton
            action={() => testSlackWebhook(webhook.id)}
            label="Send test"
            pendingLabel="…"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Edit ${webhook.label}`}
            onClick={onEdit}
          >
            <RiPencilLine className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            aria-label={`Remove ${webhook.label}`}
            onClick={() => setConfirmOpen(true)}
          >
            <RiDeleteBinLine className="size-4" />
          </Button>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {webhook.label}?</AlertDialogTitle>
              <AlertDialogDescription>
                The stored URL is deleted here. The webhook itself keeps
                existing in Slack until you revoke it there. This can&rsquo;t be
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
                {removing ? "Removing…" : "Remove webhook"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

/** Add/edit dialog. `webhook: null` = create; a blank URL keeps the stored one. */
function WebhookDialog({
  webhook,
  open,
  onOpenChange,
}: {
  webhook: SlackWebhookRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [state, action, pending] = useActionState(saveSlackWebhook, null)

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
            {webhook ? `Edit ${webhook.label}` : "Add incoming webhook"}
          </DialogTitle>
          <DialogDescription>
            {webhook
              ? "Leave the URL blank to keep the stored one."
              : "Slack → your app → Incoming Webhooks → Add New Webhook to Workspace."}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          {webhook ? (
            <input type="hidden" name="id" value={webhook.id} />
          ) : null}

          <Field>
            <FieldLabel htmlFor="slack-hook-label">Label</FieldLabel>
            <Input
              id="slack-hook-label"
              name="label"
              autoComplete="off"
              required
              placeholder="Deploy alerts"
              defaultValue={webhook?.label ?? ""}
            />
          </Field>

          <CredentialField
            id="slack-hook-url"
            name="url"
            label="Webhook URL"
            preview={webhook?.urlPreview ?? null}
            placeholder="https://hooks.slack.com/services/…"
            required={!webhook}
            serviceName="Slack"
            description="Anyone holding this URL can post to the channel, so it is encrypted at rest and never shown again in full."
          />

          <Field>
            <FieldLabel htmlFor="slack-hook-channel">
              Channel note{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id="slack-hook-channel"
              name="channel"
              autoComplete="off"
              className="font-mono"
              placeholder="#deploys"
              defaultValue={webhook?.channel ?? ""}
            />
            <FieldDescription>
              For your own reference — Slack binds the real channel to the URL.
            </FieldDescription>
          </Field>

          <label className="flex items-center gap-2">
            <Switch name="enabled" defaultChecked={webhook?.enabled ?? true} />
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
              {pending ? "Saving…" : webhook ? "Save webhook" : "Add webhook"}
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
