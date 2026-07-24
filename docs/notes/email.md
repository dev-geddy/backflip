# Notes (L3) — email

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `apps/web/app/backflip/(protected)/settings/page.tsx` — server; loads single `email_config` row (provider `resend`), maps to view model (no key decryption; `hasKey` boolean). Satisfies `L2-EMAIL-01`.
- `settings/_components/email-section.tsx` — client; toggles **summary** (configured/enabled `Badge`, masked key preview + from/reply rows, or "Not configured" + "Edit settings") and **edit** view (`EmailConfigForm` + explanation column). `onSaved`/`onCancel` return to summary on save.
- `settings/_components/email-config-form.tsx` — client; flat form; `useActionState(saveEmailConfig)`. Fields: API key (password, write-only, masked preview in placeholder), fromEmail, fromName, replyTo (`Input`), enabled (`Switch`).
- `settings/_lib/mask.ts` — shared with `ai`; `keyPreview` decrypts + masks the stored key (`L2-DB-16`). Satisfies `L2-EMAIL-06`.
- `settings/_actions.ts` — `saveEmailConfig` (`"use server"`): auth-gate → upsert on `provider` → encrypt key if provided → `revalidatePath`. Satisfies `L2-EMAIL-02`, `L2-EMAIL-06/07`.
- `packages/db` — `email_config` table + `encryptSecret`/`decryptSecret` (`L2-DB-16/18`).
- `apps/web/app/_lib/email/send.tsx` — `sendWelcomeEmail({to,name})` (`"use server"`-callable): reads single `email_config` row → soft-skip when disabled/keyless/no fromEmail → decrypt key (`L2-DB-16`) → `render(<WelcomeEmail/>)` → `resend.emails.send({html})`. Returns `SendResult` (`{sent:true,id}` | `{sent:false,reason:"not_configured"}` | `{sent:false,reason:"error"}`); never throws. Satisfies `L2-EMAIL-11`, `L2-EMAIL-13`.
- `apps/web/app/_lib/email/welcome-email.tsx` — react-email `WelcomeEmail` component; GitHub-style (neutral grays, system font, bordered white card, single green CTA to `/backflip/login`). Inline styles only. Satisfies `L2-EMAIL-12`.
- **Consumer:** `POST /api/backflip/users` route handler calls `sendWelcomeEmail` after insert (best-effort; see [[auth]]).

## App URL
- CTA link base = `APP_URL ?? AUTH_URL ?? NEXTAUTH_URL ?? http://localhost:3070`, `+ /backflip/login`.

## State
- Sending lands: `resend@6` + `@react-email/components@1` installed in `web`.
- Welcome email sent on user creation (owner adds a user). Config still admin-managed in Settings → Email.
- Not-configured is non-fatal: user creation succeeds; action returns an info message. (`L2-EMAIL-13`)
- Nav: Settings → `/backflip/settings`, Email section (after AI section, separated by rule).
- Verified: typecheck + lint clean; migration `0001_smooth_sersi.sql` applied (email_config created).

## TODO
- "Send test email" action — deferred.
- `react-email` preview/dev tooling — not wired; templates are code-only for now.
- Broaden beyond welcome (invites, password reset) — reuse the `send.tsx` pattern.
