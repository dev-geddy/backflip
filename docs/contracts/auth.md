# Contract (L2) — auth

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-01`, `L1-ARCH-04`, `L1-CON-01`, `L1-CON-02`
> **Depends on L2:** none

## Owns
Admin auth boundary for `/backflip/*`: session gate, login route, Google sign-in flow.

## Interfaces
- `L2-AUTH-01` — `proxy(request)` — gates `/backflip/:path*`; unauth → redirect `/backflip/login?from=<path>`. Login route stays public. (`apps/web/proxy.ts`) [Next 16 renamed the `middleware` convention → `proxy`.]
- `L2-AUTH-02` — Route `/backflip/login` — public admin login page (Google sign-in). [STUB — placeholder page]
- `L2-AUTH-03` — Google OAuth callback endpoint — establishes session on success. [NOT IMPLEMENTED]
- `L2-AUTH-04` — Sign-out — clears session. [NOT IMPLEMENTED]

## Schemas
- `L2-AUTH-05` — Session presence = `session` cookie with non-empty value. Full session payload shape TBD. [NEEDS HUMAN CONFIRMATION]

## Invariants
- `L2-AUTH-06` — Every `/backflip/*` path except the login route requires a valid session.
- `L2-AUTH-07` — Only Google login issues sessions (no password auth).

## Errors
- `L2-AUTH-08` — Missing/empty session → 307 redirect to login, original path in `from` query. No error body.

## Acceptance
- `L2-AUTH-09` — Unauth request to any `/backflip/*` (non-login) redirects to `/backflip/login`.
- `L2-AUTH-10` — Request with a `session` cookie reaches the protected page.
- `L2-AUTH-11` — Google sign-in yields a session accepted by the middleware. [pending impl]

## Constrained L3
- `/docs/notes/auth.md`

---
IDs: `L2-AUTH-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
