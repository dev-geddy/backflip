# Contract (L2) — ui

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-02` (public SSR), `L1-ARCH-03` (admin RSC + server actions), `L1-ARCH-05`, `L1-ARCH-07`, `L1-ARCH-08` (colocation), `L1-CON-04` (docs explorer), `L1-STACK-03`, `L1-STACK-05`, `L1-STACK-06`
> **Depends on L2:** none

## Owns
Shared design system: `packages/ui` component library, theme, and the `/ui-samples` demo.

## Interfaces
- `L2-UI-01` — `@workspace/ui/components/*` — shadcn component set. Apps import from here, never fork.
- `L2-UI-02` — `@workspace/ui/lib/utils` → `cn()` — class merge helper.
- `L2-UI-03` — `@workspace/ui/globals.css` — theme tokens (CSS vars), imported once in root layout.
- `L2-UI-04` — Root layout providers: `ThemeProvider` (next-themes), `TooltipProvider`, `Toaster` (sonner). (`apps/web/app/layout.tsx`)
- `L2-UI-05` — Route `/backflip/ui-samples` — admin-only component gallery (auth-gated, second Platform nav item below Overview); renders every component, `d` toggles dark mode. (`apps/web/app/backflip/(protected)/ui-samples/page.tsx`)
- `L2-UI-18` — Routes `/getting-started` (three-phase index: 01 Discover / 02 Set up / 03 Start building) + `/getting-started/intro` (discovery: what Backflip is, whom for) + **two droplet setup wizards**: `/getting-started/setup-on-digitalocean-droplet` (pm2 flavour) and `/getting-started/setup-on-digitalocean-droplet-docker-flavour` (Docker Postgres + Caddy) + `/getting-started/start-building` (copy-ready coding-agent prompts, prompts only) — all public + static. Both wizards are client-only: operator variables never leave the browser — kept in component state + `sessionStorage` (tab-scoped, per-guide namespace; no password is ever persisted), rendered into copyable `devops/` commands. Shared shell + chrome in `getting-started/_components/`; per-flavour command strings in each guide's `_components/setup-vars.ts`. Mirrors `L2-DEVOPS-01`, `L2-DEVOPS-02`, `L2-DEVOPS-06`; command strings must track those. (`apps/web/app/getting-started/…`)
- `L2-UI-19` — Deployed version marker: monorepo root `package.json` `version`, inlined at build time (`apps/web/next.config.ts` → `env.NEXT_PUBLIC_APP_VERSION`) and rendered by `apps/web/app/_components/app-version.tsx` as `v<version>` in small low-contrast type. Mounted on the public footer and the admin Overview — both surfaces (`L1-ARCH-01`). Build-time value; no runtime override, so it names the build in the live slot.
- `L2-UI-20` — Route `/backflip/docs` — admin docs explorer (capability `dashboard`). Renders the repo's three-level docs (`/docs/constitution.md`, `/docs/contracts/*.md`, `/docs/notes/*.md`) as a domain-chip-filtered L1 | L2 | L3 cascade over a markdown reading pane. Selection filters bidirectionally (pick any level → the other two narrow to what cites it / what it cites); rows carry child counts + drift badges. Header "Docs" link points here (was the GitHub README; README link kept in-page); also a `⌘K` jump target. No sidebar entry. The reading pane and the drift overview share one slot, so the pane carries an **Overview** control back to the list. (`apps/web/app/backflip/(protected)/docs/page.tsx`)

- `L2-UI-35` — Docs search — one input filters all three cascade columns on ID, title, body and domain (`matchesQuery`, case-insensitive substring). Lives in the query string as `q`; the input is local with a 200 ms debounce so keystrokes do not enter session history. (`docs-explorer.tsx`, `docs-graph.ts`)
- `L2-UI-36` — Cascade constraint disclosure — each column header names the selections narrowing it (`constraintsOn`) and clicking one clears that hop; a **Trace** bar above the columns shows the current L1 › L2 › L3 chain with per-hop removal. Filtering is never silent. (`docs-explorer.tsx`)
- `L2-UI-40` — Guide worked example — `exampleTrace(graph)` derives one complete L1 → L2 → L3 chain from the live index (the L1 with the most implementers, then its contract with the most notes, preferring a note heading that is not generic). Rendered as three labelled cards — why it exists / what it promises / how it is built — that load the whole trace into the cascade on click. Derived, never curated, so it cannot name a retired clause. (`docs-graph.ts`, `docs-guide.tsx`)
- `L2-UI-37` — Docs orientation — a dismissible strip (per-browser, `localStorage["backflip.docs.orientation"]`, read through `useSyncExternalStore`) stating the three levels and the citation direction, plus a **Guide** landing tab: level cards with live counts, the cite-upward/conflict-order rule, verified entry-point clauses, and the domain map. The drift list moves to a **Health** tab. Guide is the default. Page order is content-first: header, orientation, reading/guide pane, then domain chips, trace bar and the three columns — what you read above, what you navigate with below. (`docs-guide.tsx`, `docs-explorer.tsx`)
- `L2-UI-38` — Docs URL state — `domain`, `l1`, `l2`, `l3`, `clause`, `view`, `q` are the explorer's only state: back/forward work, a reload keeps position, and any view is linkable. Navigations `push`; search `replace`s. Requires a `Suspense` boundary around the explorer (`useSearchParams`). (`docs/page.tsx`, `docs-explorer.tsx`)
- `L2-UI-39` — Clause trace placement — implements-up, notes/contracts-down and `@spec` code refs render as horizontal rows directly under the clause title, not in a side rail, with the reading pane full width below. (`clause-detail.tsx`)

- `L2-UI-25` — Admin chrome theming — the signed-in user's sidebar + header palette. The protected layout resolves it server-side and stamps `data-chrome-theme="<id>"` on the shell wrapper (`SidebarProvider`), so the themed chrome arrives with the server HTML and never flashes the default. CSS lives in `packages/ui/src/styles/globals.css`: per-theme blocks set `--sidebar-*` plus a `--chrome-header-*` family, and two scoped rules re-point the base tokens (`--foreground`, `--muted-foreground`, `--border`, `--accent`, …) inside `[data-slot="site-header"]` and `[data-slot="sidebar-inner"]` so existing children need no theme awareness. Page content is never tinted. (`apps/web/app/backflip/(protected)/layout.tsx`, `_components/site-header.tsx`, `account/_components/appearance-section.tsx`)
- `L2-UI-27` — `getChromePreferences(userId)` → `{ theme, headerThemed }`, plus `setChromeTheme` / `setChromeHeaderThemed` (`apps/web/app/_lib/theme/preferences.ts`) — server-only read/upsert over `user_preference` (`L2-DB-33`). A missing row means every default; nothing is seeded at signup.
- `L2-UI-32` — Header opt-out — `user_preference.chromeHeaderThemed` (`L2-DB-33`), surfaced as the "Tint the header too" switch. Off → the layout stamps `data-chrome-header="plain"`, whose CSS block points the `--chrome-header-*` tokens back at the stock palette; the sidebar stays themed and the header follows plain light/dark. Server action `saveChromeHeaderThemed(enabled)` (`account/_actions.ts`), self-scoped, revalidates the `/backflip` layout.
- `L2-UI-33` — Custom theme — id `custom`, stored as two `#rrggbb` colors in `user_preference` (`chromeCustomSurface`, `chromeCustomAccent`, `L2-DB-33`). It has **no** stylesheet block: `customChromeVars(surface, accent)` builds the same variable set a theme block declares and the layout emits it inline on the shell wrapper. Ink, border and ring are derived from the two picks (near-white or near-black by WCAG luminance, mixed with the surface to keep its hue), so no pick can be unreadable. Server action `saveCustomChrome(surface, accent)` validates both colors. Honours `L2-UI-32`: with the header plain the `--chrome-header-*` variables are omitted from the inline set rather than overridden — inline style outranks the opt-out rule. Rendered as a two-column card beside Default. (`chrome-themes.ts`, `account/_components/appearance-section.tsx`)
- `L2-UI-28` — Server action `saveChromeTheme(theme)` (`account/_actions.ts`) — self-scoped to the session user, refuses ids outside the catalog, revalidates the `/backflip` **layout** (not just the page) so the shell re-renders.

## Schemas
- `L2-UI-26` — Chrome theme catalog (`apps/web/app/_lib/theme/chrome-themes.ts`): `default` plus fixed palettes — dark `slate` | `graphite` | `pine` | `plum` | `garnet` | `rust`, light `gold` | `sky-blue` | `sage` | `rose-gold` | `lilac` | `iris`. Each entry carries `id`, `label`, `group` and swatch colors for the picker. Ids are the single source of truth: every named id has a matching `[data-chrome-theme="<id>"]` block in `globals.css`, and every such block has a catalog entry (locked by `chrome-themes.test.ts`). Stored per user in `user_preference.chromeTheme` as free text; `resolveChromeTheme()` narrows anything unknown back to `default`. `custom` (`L2-UI-33`) is a valid id but deliberately absent from the catalog array — it has no fixed swatch and renders as its own card.
- `L2-UI-06` — shadcn config (`packages/ui/components.json`): style `base-mira`, baseColor `neutral`, RSC on, icons `remixicon`, css vars on.
- `L2-UI-07` — Aliases: components/ui → `@workspace/ui/components`, utils → `@workspace/ui/lib/utils`.
- `L2-UI-41` — Clause titles strip the concern kind-tag (`_(iface)_`, `_(inv)_`, …) before deriving a title, so a concern-grouped contract lists real clause text rather than its tag. (`parse-docs.ts`)
- `L2-UI-21` — Docs index built at **build time**, never at runtime: a `server-only` module parses `/docs/**/*.md` (headings, `L[123]-<CAT>-<NN>` IDs, `Implements L1:` / `Depends on L2:` / inline `L2-…` cite edges) and greps `@spec` tags across `apps/*`, `packages/*`, `devops/*` into one serializable index. `yarn workspace web docs:index` writes `docs-index.generated.json`; the workspace `build` script runs it before `next build`. Rationale: the Docker runner ships only `.next/standalone`, so `/docs` is absent at runtime. Dev reads the working tree live.

## Invariants
- `L2-UI-08` — One theme source: `packages/ui`. No per-app component copies.
- `L2-UI-09` — Overlay components (tooltip/toast) require their providers mounted in root layout.
- `L2-UI-10` — Web app transpiles `@workspace/ui` (`next.config.ts transpilePackages`).
- `L2-UI-14` — `Button` infers base-ui `nativeButton` from its `render` element: `<button>` → true, any other element → false. Explicit `nativeButton` overrides. Link-buttons (`render={<a/>}` / `render={<Link/>}`) need no extra prop.
- `L2-UI-15` — Shell containers hosting page content are shrinkable (`min-w-0`), so page content never forces the shell wider than its slot.
- `L2-UI-22` — Docs explorer is read-only. No doc editing or writing from the admin UI.
- `L2-UI-29` — Named chrome themes are **fixed palettes**: they do not follow the light/dark toggle, so a platform keeps its identity in either mode. Only `default` follows the mode. Chroma is held ≤ 0.06 — enough hue separation to identify a platform at a glance, never a saturated surface. Twelve named palettes, six per group. Chrome borders sit ≈0.045 L from their own surface: sidebar and header share one tint, so their seam is a hairline rather than a rule. One border color for the whole chrome — the sidebar's right edge and the header's bottom edge are the same value in every palette.
- `L2-UI-34` — One stylesheet serves both surfaces (`L2-UI-03`), so every chrome-theme rule gates itself on `[data-chrome-theme]` — an attribute stamped only by the admin shell. No admin chrome rule may apply to a public page, including rules keyed on a `data-slot` a public component could also use.
- `L2-UI-30` — Chrome theming is per user and cosmetic only. It changes no capability, is never used to signal environment or permission state, and an unknown stored id degrades to `default` rather than an unstyled shell.
- `L2-UI-23` — Drift badges are derived on read, never stored: `orphan` = ID no L3 note cites (L1: no L2 implements), `no code` = ID with zero `@spec` references, `needs confirm` = clause carrying the confirmation marker **outside inline code** (a doc quoting the marker while describing this rule is not drift), `broken ref` = cites an ID defined nowhere in `/docs`. The landing view lists every badge with its count and a one-line meaning, zeros included, so the pills on the rows are always legible.

## Errors
- `L2-UI-11` — Component used without required provider → runtime context error. Mount provider in root layout.

## Acceptance
- `L2-UI-12` — `/ui-samples` renders all components without error; dark toggle works.
- `L2-UI-13` — Any app imports a component via `@workspace/ui/components/*` and it themes correctly.
- `L2-UI-16` — No surface produces page-level horizontal scroll at ≥640px.
- `L2-UI-17` — Public + admin surfaces load with zero console errors/warnings.
- `L2-UI-24` — Every ID present in `/docs` appears in the explorer index; broken or unknown ID citations render as badges, never crash the page.
- `L2-UI-31` — Picking a theme in `/backflip/account` → Appearance repaints the live sidebar + header at once, survives a reload and every navigation under `/backflip`, and is scoped to the picking user. A failed save rolls the shell back to the stored theme. Turning off "Tint the header too" leaves the sidebar themed and returns the header to plain light/dark, live and after reload; the tiles preview that state.

## Constrained L3
- `/docs/notes/ui.md`

---
IDs: `L2-UI-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
