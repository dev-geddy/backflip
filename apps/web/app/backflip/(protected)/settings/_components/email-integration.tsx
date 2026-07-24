"use client"

import { EmailConfigForm, type EmailConfig } from "./email-config-form"

/**
 * Email (Resend) integration detail (design 2a) — single-config pane (no
 * provider tabs). Reuses `EmailConfigForm` → `saveEmailConfig`. Key stays
 * masked. Sending-domain verification is omitted (no backend).
 */
export function EmailIntegration({
  email,
  connected,
}: {
  email: EmailConfig
  connected: boolean
}) {
  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Email</h2>
          {connected ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          ) : (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Not connected
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Resend transactional email. The API key is encrypted at rest.
        </p>
      </div>

      <EmailConfigForm initial={email} />
    </div>
  )
}
