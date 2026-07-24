# Notes (L3) — auth

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `apps/web/app/_lib/auth/index.ts` — NextAuth(v5) config. Adapter `DrizzleAdapter(db)`, `session.strategy=jwt`, providers Google + Credentials, callbacks `signIn`/`jwt`/`session`. Exports `handlers, auth, signIn, signOut`. Satisfies `L2-AUTH-02`, `L2-AUTH-05`, `L2-AUTH-09`, `L2-AUTH-10`, `L2-AUTH-11`.
- `apps/web/app/_lib/auth/types.ts` — module augmentation: `session.user.id`/`role` (`role` typed `Role`), JWT `id`/`role`.
- `apps/web/app/_lib/auth/permissions.ts` — pure/client-safe RBAC: `Role`, `ROLES`, `ROLE_LABELS`, `Capability`, capability map, `can()` + `canViewUsers`/`canEditUsers`/`canAccessSettings`. Satisfies `L2-AUTH-19`, `L2-AUTH-21`. Imported by server guards AND client UI (nav, edit gating) — keep it free of server-only imports.
- `apps/web/app/_lib/auth/guard.ts` — `requireCapability(cap)` server guard (`auth()` → redirect). Satisfies `L2-AUTH-20`, `L2-AUTH-22`.
- `apps/web/app/api/auth/[...nextauth]/route.ts` — `export { GET, POST } = handlers`; `runtime = "nodejs"`. Satisfies `L2-AUTH-03`.
- `apps/web/proxy.ts` — edge gate via `getToken`; `RECOVERY_PATHS` (forgot/reset-password) bypass the gate as public. Satisfies `L2-AUTH-01`, `L2-AUTH-08`, `L2-AUTH-12`.
- `apps/web/app/backflip/(auth)/login/page.tsx` — login page (server; reads `from`, open-redirect guarded). Satisfies `L2-AUTH-04`.
- `apps/web/app/backflip/(auth)/login/_components/login-form.tsx` — client form (`login-03` block). Credentials via `signIn("credentials", {redirect:false})`; Google button via `signIn("google")`.
- `apps/web/app/backflip/(protected)/layout.tsx` — authed shell (server; `auth()` → user). SidebarProvider + AppSidebar + SidebarInset + header.
- `apps/web/app/backflip/(protected)/_components/` — `app-sidebar` (nav items carry a `capability`, filtered by role via `can()`; Account item added), `nav-main`, `nav-secondary`, `site-header`, `nav-user` (Account item → `/backflip/account`; dropdown → `signOut`), `section-cards`, `dashboard-chart`, `recent-table`, `types` (`SessionUser.role: Role`).
- `apps/web/app/backflip/(protected)/page.tsx` — dashboard: cards + chart + table.
- `apps/web/app/backflip/(protected)/users/page.tsx` — server; `requireCapability("users.view")`; reads users + derives login methods (`passwordHash` presence + `accounts` providers, hash never sent). Passes `sessionRole`/`sessionUserId`.
- `apps/web/app/backflip/(protected)/users/_components/users-list.tsx` — stacked compact cards (avatar · name+email · role · login method, smaller font); Edit shown only when `canEditUsers`. Header carries an **Add user** button, rendered only when `canEditUsers` (owner).
- `apps/web/app/backflip/(protected)/users/_components/edit-user-dialog.tsx` — owner-only Dialog: name + email + role (`Select`); role field disabled when editing self (hidden field carries the unchanged role). Satisfies `L2-AUTH-22`, `L2-AUTH-23`.
- `apps/web/app/backflip/(protected)/users/_components/add-user-dialog.tsx` — owner-only Dialog: name + email + role (`Select`, default `teammate`) + optional password. Client `fetch("POST /api/backflip/users", JSON)`; on success surfaces the returned message via `sonner` toast (reports welcome-email status, incl. "not configured"), `router.refresh()` to reload the list, resets the form, closes. Non-2xx/`ok:false` → inline error. Satisfies `L2-AUTH-22`, `L2-AUTH-25`.
- `apps/web/app/api/backflip/users/route.ts` — `POST` route handler (`runtime="nodejs"`): `users.edit` gate → validate `{name?,email,role,password?}` → optional bcrypt password (null → Google-only sign-in) → insert (unique-email 409) → best-effort `sendWelcomeEmail` (see [[email]]) → `revalidatePath` → JSON. Status: 201 · 400 · 401 · 403 · 409. Email failure/unconfigured never changes the 201. Satisfies `L2-AUTH-22`, `L2-AUTH-25`. (Aligns admin mutation with `L1-ARCH-03` API-endpoint model, unlike the server-action pattern used elsewhere.)
- `apps/web/app/backflip/(protected)/users/_actions.ts` — `updateUser` server action: `users.edit` gate, self-role guard, unique-email (pg 23505) handling. (User creation moved to the route handler above.)
- `apps/web/app/backflip/(protected)/settings/page.tsx` + `_actions.ts` — guarded by capability `settings` (owner) at route + action level.

## Authorization (RBAC)
- One capability map in `permissions.ts` drives everything: nav visibility, edit-button rendering, route guards, and action checks. Add a nav item → give it a `capability`; add a page → guard with `requireCapability`.
- Grants: owner = all; admin = dashboard + account + users.view (read-only users, no settings); teammate = dashboard + account only. See `L2-AUTH-21`.
- Server-side is authoritative (`L2-AUTH-22`): hiding UI is cosmetic; `requireCapability` (pages) + `can*` checks (actions) do the enforcing. The edge `proxy` still gates the whole `/backflip/*` subtree for authentication; capability checks are per-route inside it.

## Account page (`/backflip/account`) — self-service (built)
- `account/page.tsx` — server, `requireCapability("account")` (all roles). Cards: **Profile** (name + verified email change), **Password**, **Login methods** (read-only). `passwordHash` read only to derive a boolean; never sent to client.
- `account/_components/profile-section.tsx` — name, `useActionState(saveProfile)`, summary ↔ inline form.
- `account/_components/email-section.tsx` (`AccountEmailSection`) — request email change via `requestEmailChange`; keeps the pending "verification sent" message visible (address not yet changed).
- `account/_components/password-section.tsx` — change/set password via `changePassword`; toast on success.
- `account/_actions.ts` (self-scoped — always `session.user.id`, never a client id):
  - `saveProfile` — update name.
  - `changePassword` — verify current bcrypt when a hash exists (OAuth-only users may set a first password), min-8 + confirm, then `sendPasswordChangedEmail`.
  - `requestEmailChange` — validate + availability, mint `email_change` token (`newEmail`), `sendEmailChangeVerification` to the NEW address. Requires configured email (else "configure email first"). Does NOT change the address.
  - `confirmEmailChange(token)` — consume token, re-check availability, must match session user, swap `email`, `sendEmailChangedNotice` to the OLD address.
- `account/verify-email/page.tsx` + `_components/verify-email-confirm.tsx` — target of the verify link (protected). Button (not auto-run, avoids prefetch consuming the token) calls `confirmEmailChange`. Satisfies `L2-AUTH-27`.

## Password recovery (`(auth)`, public)
- `(auth)/_actions.ts`:
  - `requestPasswordReset` — mint `password_reset` token if the email exists, `sendPasswordResetEmail`; ALWAYS returns a generic success (no user enumeration). Satisfies `L2-AUTH-28`.
  - `resetPassword` — validate token (min-8 + confirm), set `passwordHash`, `sendPasswordChangedEmail`. Satisfies `L2-AUTH-28`.
- `(auth)/forgot-password/page.tsx` + form — public request page.
- `(auth)/reset-password/page.tsx` + form — public set-new-password page (token from query).
- `proxy.ts` — `RECOVERY_PATHS` (`/backflip/forgot-password`, `/backflip/reset-password`) bypass the auth gate (public). Satisfies `L2-AUTH-01`.
- `login/_components/login-form.tsx` — "Forgot password?" link next to the password field.
- `apps/web/app/_lib/auth/tokens.ts` — `createUserToken({userId,type,newEmail?})` (invalidates prior same-type tokens, stores `hashToken`, TTL 60m) + `consumeUserToken({rawToken,type})` (hash-lookup, checks type/expiry/consumed, marks consumed). Satisfies `L2-AUTH-29`.

## Implementation notes
- **Credentials → JWT**: Credentials provider forces `jwt` session strategy; adapter still used to persist Google accounts.
- **Google pre-registration**: `signIn` callback returns false unless `db` has a `user` with that email → no OAuth self-signup. `allowDangerousEmailAccountLinking: true` links Google to the seeded user by email (emails pre-registered/trusted).
- **Env loading**: Next runs in `apps/web`, so it won't read root `.env*` on its own. `dev` script uses `dotenv -e ../../.env -e ../../.env.local` to inject root env (needed by edge proxy + node route). Docker app gets env via compose `env_file`.
- **Edge/node split**: proxy stays edge-safe (`getToken`, no db). Full auth (adapter + bcrypt + pg) is node-only, used by the route handler.
- `packages/typescript-config/nextjs.json` sets `declaration:false` — fixes next-auth v5 TS2742 ("inferred type cannot be named") under `noEmit`.

## State
- Credentials login verified end-to-end earlier (seeded owner → session `role: owner` → protected 200).
- Login UI (`login-03`) + dashboard shell (`sidebar-08`) built; typecheck + lint clean; login page renders.
- Google wired; inert until `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` set in `.env.local`. Redirect URI `http://localhost:3070/api/auth/callback/google`.
- Sign-out wired in `nav-user` → `signOut({ callbackUrl: "/backflip/login" })`.

## Dashboard notes
- Admin shell replicated from `dashboard-01` (inset sidebar + `site-header`, `--sidebar-width`/`--header-height` vars). Logo = icon + "Backflip" (no "Admin"). Dashboard content (cards + chart) from the shadcn dashboard example. Icons mapped tabler/lucide → remixicon (project convention).
- Simplification vs example: the heavy dnd/tanstack `data-table` was replaced with a plain `@workspace/ui` table (`recent-table`). Revisit if a sortable/editable grid is needed.
- base-mira composition uses base-ui `render={<el/>}` (not `asChild`) — see [[ui]] notes.

## TODO
- Real data for cards/chart/table (currently static sample).
- Google end-to-end test once creds provided.
