import { db, decryptSecret, emailConfig } from "@workspace/db"
import { render } from "@react-email/components"
import { eq } from "drizzle-orm"
import { Resend } from "resend"

import { WelcomeEmail } from "./welcome-email"

/**
 * Result of a send attempt. `not_configured` is a soft outcome (never an error):
 * Resend is disabled, keyless, or missing a from-address. Callers treat it as a
 * non-fatal info state — sending is optional infrastructure. (`L2-EMAIL-11`)
 */
export type SendResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: "not_configured"; message: string }
  | { sent: false; reason: "error"; message: string }

const NOT_CONFIGURED_MESSAGE =
  "Email sending is not configured — no welcome email sent."

/** Base URL of this deployment, used to build absolute links in emails. */
function appUrl() {
  const raw =
    process.env.APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3070"
  return raw.replace(/\/$/, "")
}

/**
 * Send the transactional welcome email to a newly added user. Reads the single
 * Resend `email_config` row, decrypts the key server-side, renders the
 * react-email template to HTML, and sends via Resend.
 *
 * Never throws: an unconfigured provider returns `not_configured`, and any send
 * failure returns `error` — so user creation is never blocked by email.
 * (`L2-EMAIL-12`, `L2-EMAIL-13`)
 */
export async function sendWelcomeEmail(params: {
  to: string
  name?: string | null
}): Promise<SendResult> {
  const [cfg] = await db
    .select()
    .from(emailConfig)
    .where(eq(emailConfig.provider, "resend"))

  // Soft "not configured": disabled, no key, or no verified sender address.
  if (!cfg || !cfg.enabled || !cfg.apiKeyEnc || !cfg.fromEmail) {
    return {
      sent: false,
      reason: "not_configured",
      message: NOT_CONFIGURED_MESSAGE,
    }
  }

  try {
    const resend = new Resend(decryptSecret(cfg.apiKeyEnc))
    const appName = cfg.fromName?.trim() || "Backflip"
    const loginUrl = `${appUrl()}/backflip/login`

    const html = await render(
      <WelcomeEmail name={params.name} loginUrl={loginUrl} appName={appName} />
    )
    const from = cfg.fromName
      ? `${cfg.fromName} <${cfg.fromEmail}>`
      : cfg.fromEmail

    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `Welcome to ${appName}`,
      html,
      ...(cfg.replyTo ? { replyTo: cfg.replyTo } : {}),
    })

    if (error) {
      return { sent: false, reason: "error", message: error.message }
    }
    return { sent: true, id: data?.id ?? null }
  } catch (e) {
    return {
      sent: false,
      reason: "error",
      message: e instanceof Error ? e.message : "Failed to send email",
    }
  }
}
