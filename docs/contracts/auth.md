# Contract (L2) — auth

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-01`, `L1-ARCH-04`, `L1-CON-01`, `L1-CON-02`, `L1-STACK-10`
> **Depends on L2:** `db` (user table), `infra` (AUTH_* env)

## Owns
Admin auth for `/backflip/*`: Auth.js config, providers, session gate, login route.

## Interfaces
- `L2-AUTH-01` — `proxy(request)` — edge gate on `/backflip/:path*`. Reads Auth.js JWT via `getToken`. Unauth → redirect `/backflip/login?from=<path>`; authed on `/backflip/login` → redirect `/backflip`. Login route otherwise public. (`apps/web/proxy.ts`)
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

## Errors
- `L2-AUTH-12` — Missing/invalid session → 307 redirect to login, original path in `from`. No error body.
- `L2-AUTH-13` — Bad credentials → Auth.js returns to login with error (no session issued).
- `L2-AUTH-14` — Google email not pre-registered → sign-in denied (`signIn` returns false).
- `L2-AUTH-15` — Missing `AUTH_SECRET` → Auth.js "server configuration" error. Ensure root env loaded (dev script uses dotenv; docker uses compose `env_file`).

## Acceptance
- `L2-AUTH-16` — Unauth request to any `/backflip/*` (non-login) redirects to `/backflip/login`.
- `L2-AUTH-17` — Valid credentials → session with `user.role`; protected page reachable.
- `L2-AUTH-18` — Google sign-in with a pre-registered email yields a session; unknown email is rejected.

## Constrained L3
- `/docs/notes/auth.md`

---
IDs: `L2-AUTH-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
