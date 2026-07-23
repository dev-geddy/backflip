# Notes (L3) — auth

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `apps/web/app/_lib/auth/index.ts` — NextAuth(v5) config. Adapter `DrizzleAdapter(db)`, `session.strategy=jwt`, providers Google + Credentials, callbacks `signIn`/`jwt`/`session`. Exports `handlers, auth, signIn, signOut`. Satisfies `L2-AUTH-02`, `L2-AUTH-05`, `L2-AUTH-09`, `L2-AUTH-10`, `L2-AUTH-11`.
- `apps/web/app/_lib/auth/types.ts` — module augmentation: `session.user.id`/`role`, JWT `id`/`role`.
- `apps/web/app/api/auth/[...nextauth]/route.ts` — `export { GET, POST } = handlers`; `runtime = "nodejs"`. Satisfies `L2-AUTH-03`.
- `apps/web/proxy.ts` — edge gate via `getToken`. Satisfies `L2-AUTH-01`, `L2-AUTH-08`, `L2-AUTH-12`.
- `apps/web/app/backflip/(auth)/login/page.tsx` — login page (server; reads `from`, open-redirect guarded). Satisfies `L2-AUTH-04`.
- `apps/web/app/backflip/(auth)/login/_components/login-form.tsx` — client form (`login-03` block). Credentials via `signIn("credentials", {redirect:false})`; Google button via `signIn("google")`.
- `apps/web/app/backflip/(protected)/layout.tsx` — authed shell (server; `auth()` → user). SidebarProvider + AppSidebar + SidebarInset + header.
- `apps/web/app/backflip/(protected)/_components/` — `app-sidebar`, `nav-main` (collapsible groups), `nav-user` (dropdown → `signOut`), `section-cards`, `dashboard-chart` (recharts area), `recent-table`, `types`.
- `apps/web/app/backflip/(protected)/page.tsx` — dashboard: cards + chart + table.

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
- Admin shell replicated from `sidebar-08`; dashboard content (cards + chart) from the shadcn dashboard example. Icons mapped lucide → remixicon (project convention).
- Simplification vs example: the heavy dnd/tanstack `data-table` was replaced with a plain `@workspace/ui` table (`recent-table`). Revisit if a sortable/editable grid is needed.
- base-mira composition uses base-ui `render={<el/>}` (not `asChild`) — see [[ui]] notes.

## TODO
- Real data for cards/chart/table (currently static sample).
- Google end-to-end test once creds provided.
