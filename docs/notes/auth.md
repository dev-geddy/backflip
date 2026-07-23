# Notes (L3) — auth

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `apps/web/middleware.ts` — session gate. Satisfies `L2-AUTH-01`, `L2-AUTH-06`, `L2-AUTH-08`. Matcher `/backflip/:path*`.
- `apps/web/app/backflip/layout.tsx` — scope root layout. Wraps (auth) + (protected). Shell TBD.
- `apps/web/app/backflip/(auth)/login/page.tsx` — login page. Satisfies `L2-AUTH-02`. Placeholder.
- `apps/web/app/backflip/(protected)/layout.tsx` — authed chrome host. Placeholder.
- `apps/web/app/backflip/(protected)/page.tsx` — admin dashboard. Placeholder.

## State (as of bootstrap)
- Auth is a **setup-only stub**. Session = presence of non-empty `session` cookie.
- No Google OAuth yet: `L2-AUTH-03` (callback), `L2-AUTH-04` (sign-out) not implemented.
- Login page renders placeholder text, no real sign-in button.

## Deviations
- `L2-AUTH-05` — no real session payload/signing. Cookie presence only. Insecure; stub for wiring, not security.
- `L2-AUTH-07` — invariant declared but unenforced (no auth provider wired yet).

## TODO
- Wire Google OAuth (provider choice: next-auth / arctic / custom). Establish signed session.
- Define session payload schema → update `L2-AUTH-05`.
- Real login UI on `/backflip/login`.
- Sign-out route.

## ADR
_(none yet)_
