# Notes (L3) — ui

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `packages/ui/src/components/*.tsx` — shadcn component set. Satisfies `L2-UI-01`.
- `packages/ui/src/lib/utils.ts` — `cn()`. Satisfies `L2-UI-02`.
- `packages/ui/src/styles/globals.css` — theme tokens + Tailwind `@source` globs. Satisfies `L2-UI-03`. `@source` paths are relative to this file (4 levels up = repo root): `../../../../apps/**`, `../../../../components/**`, `../**` (packages/ui itself). All consumer `.tsx` must be covered or their utility classes aren't generated.
- `packages/ui/components.json` — shadcn config. Satisfies `L2-UI-06`, `L2-UI-07`.
- `apps/web/app/layout.tsx` — mounts ThemeProvider + TooltipProvider + Toaster. Satisfies `L2-UI-04`, `L2-UI-09`.
- `apps/web/app/page.tsx` — public marketing homepage (RSC/SSR). Composes `_components/`: `SiteHeader`, `Hero`, `FeatureGrid`, `HowItWorks`, `WordmarkBand`, `SiteFooter`. Sets page `metadata`. Satisfies `L2-UI-11` (proposed).
- `apps/web/app/_components/*` — homepage sections (app-scoped, `L1-ARCH-07/08`): `site-header.tsx` (`"use client"` — sticky nav + wordmark + theme toggle via `useTheme`, links use `Button render={<a/>}`), `hero.tsx` (headline + CTAs over CSS stripe texture, no image), `feature-grid.tsx` (5 `Card`s from `FEATURES`, remixicon icons), `how-it-works.tsx` (3-step band on `bg-muted`), `wordmark-band.tsx` (oversized `text-muted-foreground/20` accent), `site-footer.tsx`. Theme tokens only, no hex. Icons remixicon only.
- `apps/web/app/backflip/(protected)/users/page.tsx` — admin user list (RSC). Selects display fields from `users` (no hash), newest first; renders `UsersList`. Sidebar `Users` links here.
- `apps/web/app/backflip/(protected)/users/_components/users-list.tsx` — flat details card: `PageHeading` (title + `AddUserDialog` action) over a bordered `divide-y` list; each row avatar + name + mono email + role line + role `Badge` + `EditUserDialog` (owner only).
- `apps/web/app/ui-samples/page.tsx` — component demo (`UISamplesPage`, heading "UI Samples"), dashboard/masonry layout reproducing the `base-mira` create-preview; exercises ~50 components (item, field, input-group, native-select, toggle-group, chart/recharts, empty, spinner, progress, calendar, radio, table, tabs, accordion, …). `d` = dark toggle. Satisfies `L2-UI-05`, `L2-UI-12`. Note: uncontrolled `defaultValue` passed to base-ui ToggleGroup/Slider must be stable module-scope refs (base-ui warns on identity change per render).
- `apps/web/next.config.ts` — `transpilePackages: ["@workspace/ui"]`. Satisfies `L2-UI-10`.

## Admin flat restyle ("Flat Admin" design) — L2-UI-03
Protected `/backflip/*` surface restyled to a flat, hairline aesthetic (imported from claude.ai/design "Flat Admin"). **Theme tokens unchanged** — already flat-neutral; radius already matches (cards `rounded-xl` ≈ 11px, controls ≈ 7.6px). Restyle is component/layout only.
- Shared primitives: `(protected)/_components/page-heading.tsx` — `PageHeading` (large tracking-tight title + muted subtitle + optional trailing `action`) and `SectionLabel` (uppercase `text-xs` micro-label). Layout-scoped (`L1-ARCH-08`).
- `section-cards.tsx` — flat stat cards: `SectionLabel` + big `tabular-nums` value + optional unit / emerald·red delta / slim progress bar / emerald status dot + muted caption. No `Card`/`Badge` chrome.
- `site-header.tsx` — breadcrumb title reduced to `text-sm font-medium`.
- `account/page.tsx` — design "My account": `PageHeading` + profile summary card + bordered "Account details" list (`border-t` hairline rows wrapping Profile/Email/Password sections) + Login methods card. Section summary rows reshaped to `w-32` muted label | value | trailing button; email shows mono value + emerald "Verified" pill; password shows masked dots. Edit forms unchanged (functionality preserved).
- `settings/page.tsx` — `PageHeading` + `SectionLabel`'d bordered cards (AI / Email). `@spec L2-AI-01, L2-EMAIL-01` unchanged.
- Sidebar (`app-sidebar`, `nav-*`) intentionally **not** restyled — logo top / user-menu bottom positioning + functionality kept per request; fonts inherit theme.
- Menu unchanged: Dashboard/Users/Account/Settings (no items added).
- Green pills use `emerald-*` utilities (only non-token color; light+dark variants). Everything else theme tokens.

## Form-element sizing (house tweak, padding only)
Form primitives get +2px padding + grown heights over base-mira defaults — **font sizes unchanged**: `button` (size + icon variants), `input`, `textarea`, `native-select`, `select` trigger. Arbitrary px (`px-[10px]`, `py-[4px]`, `h-8`) where no clean Tailwind step. No theme-level text-scale bump (reverted). `cursor: pointer` on buttons is a base-layer rule. Re-`shadcn add` would overwrite these.

## Installed components (60)
Full `base-mira` registry (added via `shadcn add -a -c packages/ui`):
accordion, alert, alert-dialog, aspect-ratio, attachment, avatar, badge, breadcrumb, bubble,
button, button-group, calendar, card, carousel, chart, checkbox, collapsible, combobox, command,
context-menu, dialog, direction, drawer, dropdown-menu, empty, field, hover-card, input,
input-group, input-otp, item, kbd, label, marker, menubar, message, message-scroller,
native-select, navigation-menu, pagination, popover, progress, radio-group, resizable,
scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch,
table, tabs, textarea, toggle, toggle-group, tooltip.

Hook: `src/hooks/use-mobile.ts` (sidebar).

## Deps added for components
- `sonner` — toast (needs `<Toaster/>`).
- `react-day-picker` + `date-fns` — calendar.
- `recharts` — chart.
- `cmdk` — command / combobox.
- `embla-carousel-react` — carousel.
- `input-otp` — input-otp.
- `react-resizable-panels` — resizable.
- `@shadcn/react` — registry runtime helpers.

## Deviations
- `spinner.tsx` — registry shipped `React.ComponentProps<"svg">`; retyped to `ComponentProps<typeof RiLoaderLine>` (remixicon `children: undefined` clash). Local edit; re-check on `shadcn add` overwrite.

## Base scale
- `globals.css` sets `html { font-size: 17px }` (up from 16). base-mira ships compact; this scales all rem sizes (text, control heights, padding, gaps) ~6% for a slightly larger, roomier feel. Tune this single value to rescale the whole UI.

## Reference
- Admin/dashboard UI is built from **shadcn blocks**: https://ui.shadcn.com/blocks — browse for layouts/components. In use: `login-03` (login), `dashboard-01` (admin shell), `sidebar-08` (earlier shell). Clone source to `.external-repos/` (gitignored) when replicating; port `asChild`→`render`, lucide/tabler→remixicon.

## Composition (base-mira / base-ui)
- base-mira components compose via base-ui `useRender` — pass `render={<el/>}` with children as siblings, NOT Radix-style `asChild` + child. E.g. `<SidebarMenuButton render={<a href={url} />}>…</SidebarMenuButton>`, `<Collapsible render={<SidebarMenuItem />}>`, `<DropdownMenuTrigger render={<SidebarMenuButton />}>`.
- When porting shadcn new-york blocks (which use `asChild`), rewrite to `render`. Also map lucide icons → remixicon.

## Fixed
- `@source` globs in globals.css were one level short (`../../../apps` → `packages/apps`, nonexistent). Tailwind never scanned `apps/web`, so app-level utility classes (page layout on `/ui-samples`) weren't generated → page rendered unstyled vs shadcn preview. Corrected to `../../../../` (repo root).

## TODO
- _(none)_ — admin chrome (sidebar/topbar) landed; flat-restyled (see "Admin flat restyle").

## ADR
_(none yet)_
