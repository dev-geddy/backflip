# Notes (L3) — email

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `apps/web/app/backflip/(protected)/settings/page.tsx` — server; loads single `email_config` row (provider `resend`), maps to view model (no key decryption; `hasKey` boolean). Satisfies `L2-EMAIL-01`.
- `settings/_components/email-config-form.tsx` — client; flat form; `useActionState(saveEmailConfig)`. Fields: API key (password, write-only), fromEmail, fromName, replyTo (`Input`), enabled (`Switch`).
- `settings/_actions.ts` — `saveEmailConfig` (`"use server"`): auth-gate → upsert on `provider` → encrypt key if provided → `revalidatePath`. Satisfies `L2-EMAIL-02`, `L2-EMAIL-06/07`.
- `packages/db` — `email_config` table + `encryptSecret`/`decryptSecret` (`L2-DB-16/18`).

## State
- Scope = config + persistence only. No send calls yet; Resend SDK not installed until sending lands.
- Nav: Settings → `/backflip/settings`, Email section (after AI section, separated by rule).
- Verified: typecheck passes; migration `0001_smooth_sersi.sql` applied (email_config created).

## TODO
- Install Resend SDK; build a send layer reading `email_config` (decrypt key server-side) → send transactional email.
- "Send test email" action — deferred.
