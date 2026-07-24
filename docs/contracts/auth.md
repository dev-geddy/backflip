# Contract (L2) — auth

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-01`, `L1-ARCH-04`, `L1-CON-01`, `L1-CON-02`, `L1-STACK-10`
> **Depends on L2:** `db` (user table), `infra` (AUTH_* env)

## Owns
Admin auth for `/backflip/*`: Auth.js config, providers, session gate, login route, and the role-based authorization model (capabilities).

## Interfaces
- `L2-AUTH-01` — `proxy(request)` — edge gate on `/backflip/:path*`. Reads Auth.js JWT via `getToken`. Unauth → redirect `/backflip/login?from=<path>`; authed on `/backflip/login` → redirect `/backflip`. Login route otherwise public. (`apps/web/proxy.ts`)
- `L2-AUTH-19` — `@/app/_lib/auth/permissions` — pure, client-safe authorization model: `Role` (`owner|admin|teammate`), `ROLES`, `ROLE_LABELS`, `Capability`, `can(role, capability)`, helpers `canViewUsers`/`canEditUsers`/`canAccessSettings`. Single source of truth for grants.
- `L2-AUTH-20` — `@/app/_lib/auth/guard` → `requireCapability(capability)` — server-only route guard. Unauth → `/backflip/login`; authed but lacking capability → `/backflip`. Returns the session user.
- `L2-AUTH-02` — `@/app/_lib/auth` → `{ handlers, auth, signIn, signOut }` — Auth.js v5 (NextAuth) instance. Node runtime (uses `pg`).
- `L2-AUTH-03` — Route `/api/auth/[...nextauth]` — Auth.js handlers (sign-in/out, callbacks, session, csrf, providers). `runtime = "nodejs"`.
- `L2-AUTH-04` — Route `/backflip/login` — public login page: credentials form + Google button.
- `L2-AUTH-05` — Providers: **Credentials** (email + password) and **Google** (OAuth, `allowDangerousEmailAccountLinking`).

## Schemas
- `L2-AUTH-06` — Session = Auth.js JWT (encrypted cookie). Strategy `jwt` (required by Credentials). Payload exposes `user.id`, `user.email`, `user.name`, `user.role`.
- `L2-AUTH-07` — Env: `AUTH_SECRET`, `AUTH_TRUST_HOST`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (root `.env.local`). Credentials work without Google vars.

## Invariants
- `L2-AUTH-08` — Every `/backflip/*` path except the login route requires a valid session.
- `L2-AUTH-09` — Credentials auth verifies email + bcrypt(`user.passwordHash`). No plaintext compare.
- `L2-AUTH-10` — Google sign-in succeeds only if a `user` row with that email already exists (enforced in `signIn` callback). No self-registration via OAuth.
- `L2-AUTH-11` — Google callback links to the existing user by verified email (pre-registered emails are trusted).
- `L2-AUTH-21` — Capability grants: **owner** = all (`dashboard`, `account`, `users.view`, `users.edit`, `settings`); **admin** = `dashboard`, `account`, `users.view`; **teammate** = `dashboard`, `account`. Owner is the superset.
- `L2-AUTH-22` — Authorization is enforced server-side (route guards via `requireCapability`, per-action capability checks, and per-endpoint checks), never UI-only. Hidden nav items / buttons are cosmetic. Guarded: `/backflip/users` (`users.view`) + `updateUser` (`users.edit`) + `POST /api/backflip/users` (`users.edit`); `/backflip/settings` + `saveAiConfig`/`saveEmailConfig` (`settings`).
- `L2-AUTH-25` — `POST /api/backflip/users` route handler (owner, `users.edit`; `runtime="nodejs"`) — JSON body `{name?, email, role, password?}`. Inserts a `user` row; optional password → `passwordHash` null means Google-only sign-in (email must be pre-registered per `L2-AUTH-10/11`). On success a welcome email is sent best-effort (`L2-EMAIL-11`); an unconfigured provider or send failure never changes the outcome. Status: 201 created · 400 validation · 401 unauth · 403 forbidden · 409 duplicate email. (`apps/web/app/api/backflip/users/route.ts`)
- `L2-AUTH-23` — Self-lockout guard: an owner cannot change their own role (enforced in `updateUser`).

## Errors
- `L2-AUTH-12` — Missing/invalid session → 307 redirect to login, original path in `from`. No error body.
- `L2-AUTH-13` — Bad credentials → Auth.js returns to login with error (no session issued).
- `L2-AUTH-14` — Google email not pre-registered → sign-in denied (`signIn` returns false).
- `L2-AUTH-15` — Missing `AUTH_SECRET` → Auth.js "server configuration" error. Ensure root env loaded (dev script uses dotenv; docker uses compose `env_file`).

## Acceptance
- `L2-AUTH-16` — Unauth request to any `/backflip/*` (non-login) redirects to `/backflip/login`.
- `L2-AUTH-17` — Valid credentials → session with `user.role`; protected page reachable.
- `L2-AUTH-18` — Google sign-in with a pre-registered email yields a session; unknown email is rejected.
- `L2-AUTH-24` — teammate visiting `/backflip/users` or `/backflip/settings` → redirect `/backflip`; admin visiting `/backflip/settings` → redirect. Owner reaches both; only owner sees Edit / Add user on users and can save settings.
- `L2-AUTH-26` — Owner adds a user via the Add user dialog → the row appears in the list; a non-owner never sees the control and `POST /api/backflip/users` rejects a non-owner call with 403 (`L2-AUTH-25`).

## Constrained L3
- `/docs/notes/auth.md`

---
IDs: `L2-AUTH-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
