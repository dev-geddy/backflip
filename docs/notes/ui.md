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
- `apps/web/app/backflip/(protected)/users/page.tsx` — admin Members surface (RSC). Selects `users` display fields + `emailVerified`/`createdAt` (no hash), newest first; derives per-member `loginMethods`, `usesGoogle`, `status` (Active/Pending) + workspace counts; renders `MembersView`. Sidebar `Users` links here. (Members master-detail — see "Members (design 1A)".)
- `apps/web/app/ui-samples/page.tsx` — component demo (`UISamplesPage`, heading "UI Samples"), dashboard/masonry layout reproducing the `base-mira` create-preview; exercises ~50 components (item, field, input-group, native-select, toggle-group, chart/recharts, empty, spinner, progress, calendar, radio, table, tabs, accordion, …). `d` = dark toggle. Satisfies `L2-UI-05`, `L2-UI-12`. Note: uncontrolled `defaultValue` passed to base-ui ToggleGroup/Slider must be stable module-scope refs (base-ui warns on identity change per render).
- `apps/web/next.config.ts` — `transpilePackages: ["@workspace/ui"]`. Satisfies `L2-UI-10`.

## Admin flat restyle ("Flat Admin" design) — L2-UI-03
Protected `/backflip/*` surface restyled to a flat, hairline aesthetic (imported from claude.ai/design "Flat Admin"). **Theme tokens unchanged** — already flat-neutral; radius already matches (cards `rounded-xl` ≈ 11px, controls ≈ 7.6px). Restyle is component/layout only.
- Shared primitives: `(protected)/_components/page-heading.tsx` — `PageHeading` (large tracking-tight title + muted subtitle + optional trailing `action`) and `SectionLabel` (uppercase `text-xs` micro-label). Layout-scoped (`L1-ARCH-08`).
- `section-cards.tsx` — flat stat cards: `SectionLabel` + big `tabular-nums` value + optional unit / emerald·red delta / slim progress bar / emerald status dot + muted caption. No `Card`/`Badge` chrome.
- `site-header.tsx` — see "Admin chrome (design-matched)".
- `account/page.tsx` — design "My account": `PageHeading` + profile summary card + bordered "Account details" list (`border-t` hairline rows wrapping Profile/Email/Password sections) + Login methods card. Section summary rows reshaped to `w-32` muted label | value | trailing button; email shows mono value + emerald "Verified" pill; password shows masked dots. Edit forms unchanged (functionality preserved).
- `settings/page.tsx` — Integrations master-detail (see "Integrations page"). `@spec L2-AI-01, L2-EMAIL-01` unchanged.
- Menu unchanged: Dashboard/Users/Account/Settings (no items added).
- Green pills use `emerald-*` utilities (only non-token color; light+dark variants). Everything else theme tokens.

## Admin chrome (design-matched) — L2-UI-03
Sidebar + header + shell now match the Flat Admin design layout (a later pass superseded the earlier "sidebar not restyled" note). Menu items/routes unchanged (Dashboard/Users/Account/Settings).
- `(protected)/layout.tsx` — sidebar switched from `variant="inset"` (floating) to **flush** (default `variant="sidebar"`, border-right); `--sidebar-width: 15.5rem`, `--header-height: 3.5rem`; content area on a soft `bg-muted/40` canvas so white panels/cards pop; passes `userName`/`userInitials` to the header.
- `app-sidebar.tsx` (client) — dark rounded **logo square** (`RiShapesLine`) + "Backflip" / "Admin console" subtitle; nav split into labeled groups **Platform** (Overview) + **Settings** (Users, Account, Integrations) via `SidebarGroupLabel`; the Settings group is `mt-auto` (pinned to the bottom, above the user footer, which has `border-t border-sidebar-border`); **active** state from `usePathname` (`isActive`, exact for `/backflip`, prefix otherwise); groups filtered by `can(role, cap)`.
- `nav-user.tsx` — footer chip now shows role (was email); dropdown (Account / Log out) unchanged.
- `site-header.tsx` (client) — `usePathname` breadcrumb trail (e.g. Settings / My account), `SidebarTrigger`, right-aligned Docs link + avatar. Breadcrumb `nav` and the right cluster are both shrinkable (`min-w-0`, `truncate` / `shrink`) so the header never forces horizontal scroll on narrow viewports.
- Removed: `nav-main.tsx`, `nav-secondary.tsx` (nav inlined into `app-sidebar`).
- Nav labels renamed to design: **Overview** (was Dashboard) + **Integrations** (was Settings; icon `RiCheckboxMultipleBlankLine`). Routes/capabilities unchanged (`/backflip`, `/backflip/settings`, caps `dashboard`/`settings`). Menu item type `text-[13px]`, group labels `text-[11px]` to match a1.
- **Full-bleed content:** shell (`layout.tsx`) drops all outer padding/gap — content area is edge-to-edge on a `bg-muted/40` canvas. Master-detail pages (`MembersView`, `IntegrationsView`) are now a **single flush `bg-card` region** (list `lg:w-[372px] lg:border-r` | detail `flex-1` | rail `w-[300px] xl:border-l p-4`), no rounded cards/gaps. Padded pages own their padding: dashboard + `account` wrap in `p-4 md:p-6` (account stays `max-w-5xl` centered).
- `header-search.tsx` + `overview-jump.tsx` — quick-jump: `⌘K` `CommandDialog` (cmdk) over shared `jump-targets.ts` (`JUMP_GROUPS`) → `router.push`. Compact button in `site-header`; large field on Overview.
- Sidebar `collapsible="icon"` (was offcanvas) → contracted = 60px icon rail (design 1B); `--sidebar-width-icon: 3.5rem`; logo/user buttons get `group-data-[collapsible=icon]:p-0!` so tile/avatar fit. Header divider is a plain `h-4 w-px bg-border` span (base-mira `Separator` forces `data-vertical:self-stretch`, so it stretched/misaligned — a fixed span centered by the header's `items-center` is reliable).

## Overview page — design 5A (L2-UI-03)
`/backflip` rebuilt from generic stat-cards/chart/table to the 5A home. **Real data only.**
- `page.tsx` (RSC) — greeting (`Welcome back, {firstName}`, real date) + `OverviewJump` + 3 real stat cards (Members total/active/pending, Integrations enabled + health dot, Pending) + 2 info cards: **Finish setting up** (4 real steps derived from name/user-count/ai/email config) + **Recent members** (newest 4 from `users`). Full-bleed white (`bg-card`, `max-w-[900px]` centered).
- Removed: `section-cards.tsx`, `dashboard-chart.tsx`, `recent-table.tsx`.
- `_components/overview-jump.tsx` — large quick-jump field opening the shared command palette.

## Members page — design 1A master-detail (L2-UI-03; auth domain UI)
`/backflip/users` ported from a flat card list to a 3-column master/detail (design "Flat Admin" 1A). **Layout-faithful, real-data-only** — no schema/action changes; unsupported design chrome omitted.
- `users/_components/types.ts` — `Member` (+ derived `status`, `usesGoogle`, `joined`), `WorkspaceCounts`. `MemberStatus` = `active` (has login method OR `emailVerified`) | `pending` (neither). No "suspended" (no backend).
- `members-view.tsx` (client shell) — selection + `mode` (overview/edit/new) + search/filter state; `flex h-full min-h-0` 3 cols (list `lg:w-[22rem]`, detail `flex-1`, rail `xl:` only). < lg: list/detail stack via `mobileDetail` toggle + back control.
- `members-list.tsx` — header + count + `New` (owner), search, filter pills (All/Active/Pending), rows (avatar, name + mono email, Google icon from `loginMethods`, status dot), selected = `border-l-2 border-primary bg-muted`.
- `member-detail.tsx` — reproduces design 1a: 52px avatar header (status dot · role, Edit); **Overview** `justify-between` def-rows (Member ID mono = `users.id`, Email + "Verified", Role, Sign-in method + circle-`G` `GoogleMark`, Date added = `createdAt`); header `HeaderActions` = Edit + kebab (`RiMore2Line`, hidden for self) → **Remove user** with an `AlertDialog` confirm → new `deleteUser` action; on success `onRemoved` clears selection + revalidates. **Edit** — "Edit member" title + 2-col grid (Full name, Email, Role full-span) → existing `updateUser` (self-role-lock kept); **New** form (name/email/role radio-cards/optional password) → existing `POST /api/backflip/users` + `router.refresh()`. 1a's Team/Two-factor/Status-edit/kebab omitted (no backend). Folds in the removed dialogs.
- `member-rail.tsx` — permissions card (✓/— live from `can(member.role, cap)`), workspace stat counts, static help card.
- Omitted (no backend): bulk suspend/delete, kebab disable/remove/mark-unverified, Team, Two-factor, Suspended status, last-active.
- Removed: `users-list.tsx`, `add-user-dialog.tsx`, `edit-user-dialog.tsx`. `_actions.ts` `updateUser` + REST route unchanged.

## Account page — design 4a (L2-UI-03; auth domain UI)
`/backflip/account` ported to the "My account" 2-column: details left, security rail right. **Real-data-only**, actions unchanged.
- `account/page.tsx` — also selects `emailVerified`. Full-bleed 4a layout: white `bg-card` main (`max-w-[680px]` content, `p-6 lg:p-8`) + a right rail with `border-l bg-muted/50` (stacks under main < lg with `border-t`). Passes `emailVerified` + `loginMethods` to rail + email pill.
  - Rail width is stepped: `lg:w-64` (256px) → `xl:w-80` (320px), so the main column keeps usable width on ~1200px viewports instead of being squeezed by a fixed 320px rail. Rail and main content both carry `min-w-0` so neither blocks shrinking.
- `_components/profile|password|email-section.tsx` — summary→edit switched from swap to **inline-expand** (row stays; form drops below on `bg-muted/40`).
  - Email: 2-step `Stepper` (Details → Verify). Step 1 = real `requestEmailChange` (new email + current-password step-up when `hasPassword`); on `state.ok` → step 2 amber "check your inbox" (link-based, deferred swap). **No 6-digit codes.** Verified pill driven by real `emailVerified`.
  - Password: `changePassword` unchanged + a **client-only strength meter** (`strength()` heuristic: length + char-class → 4-seg bar) + show-passwords toggle.
- `_components/account-rail.tsx` — Account security card (Email Verified/Unverified from real state, Sign-in method badges) + static "Why verify twice?" info card.
- Omitted (no backend): Two-factor, last sign-in, session/device list, danger-zone/deactivate.

## Integrations page — design 2a master-detail (L2-UI-03; ai + email domains UI)
`/backflip/settings` (owner-only) ported to a master-detail of the two **real** integrations. **Real-data-only**, actions/encryption unchanged; keys stay masked (no Reveal).
- `settings/page.tsx` — same `aiConfig`/`emailConfig` fetch + `ProviderConfig[]`/`EmailConfig` shapes; renders `IntegrationsView`.
- `_components/integrations-view.tsx` (client shell) — 3-col: list (2 rows: "AI providers · N connected", "Email · Resend", status dots) + detail + `xl:` rail; `mobileDetail` stack < lg.
- `ai-integration.tsx` — provider tabs (Anthropic/OpenAI/Google, status dot) + `ProviderPane` (`key`ed per provider): design-2a header (logo tile · `PACKAGE` mono badge · connected status · **Enabled** toggle) over credentials (masked key) + Default-model select + "Set as default" toggle + Save (`saveAiConfig`), then Available-models list. Models list is static (`MODELS`) pending L2-AI live-models approval.
- `email-integration.tsx` — design 2a Resend pane: header (Re tile · `resend` mono chip · Connected status · Enabled toggle) over inlined credentials form (masked key, Default from address, From name, Reply-to) → `saveEmailConfig`. Sending-domain/Reveal/Disconnect omitted (no backend). `email-config-form.tsx` slimmed to just the `EmailConfig` type.
- `integrations-rail.tsx` — About service + docs link + "keys encrypted at rest" note.
- `ai-config-form.tsx` — plain module (no client): exports `ProviderConfig`, `LABEL`, `PACKAGE`, `MODELS`. `ProviderForm`/`AiConfigForm` removed (form inlined as `ProviderPane`).
- Removed: `ai-section.tsx`, `email-section.tsx` (view/edit-toggle wrappers superseded).
- Omitted (no backend): Reveal key, Analytics/PostHog, usage metrics, sending-domain verification, org-id/base-url.

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
- **Link-buttons need no `nativeButton`.** `Button` (`packages/ui/src/components/button.tsx`) derives base-ui's `nativeButton` from the `render` element: `render.type === "button"` → `true`, any other element (`<a>`, `<Link>`) → `false`. Explicit `nativeButton` still wins; function-form `render` can't be inspected and keeps base-ui's `true` default. Call sites write `<Button render={<a href="…" />}>` and stay warning-free.

## Fixed
- `@source` globs in globals.css were one level short (`../../../apps` → `packages/apps`, nonexistent). Tailwind never scanned `apps/web`, so app-level utility classes (page layout on `/ui-samples`) weren't generated → page rendered unstyled vs shadcn preview. Corrected to `../../../../` (repo root).
- **Admin shell forced page-wide horizontal scroll.** `SidebarInset` (`sidebar.tsx`) was `w-full flex-1` with no `min-w-0`. Flex items default to `min-width: auto`, so `main` could not shrink below its content's min-content width — at 1200×600 on `/backflip/account` it rendered 1020px inside a 936px slot, pushing `document.scrollWidth` to 1284. Added `min-w-0`. Shell-wide: header and every admin page overflowed identically, not just account.
- **Base UI button-semantics warning ×4 on the public homepage.** `Button` passed base-ui's default `nativeButton: true` while rendering `<a>` (site-header ×2, hero ×2), so base-ui warned that native button semantics were lost. Fixed centrally by inferring `nativeButton` from `render` (see "Composition") rather than patching call sites — the same latent bug existed at `app-sidebar.tsx` ×2, `verify-email-confirm.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`. Verified: 0 console errors/warnings across `/`, `/ui-samples`, `/backflip/login`, `/backflip/forgot-password`, `/backflip`, `/backflip/users`, `/backflip/account`, `/backflip/settings`.
- **Admin header overflowed below `lg`.** The right cluster (`ml-auto`) plus breadcrumb could not compress — +33px at 768. Cluster got `min-w-0 shrink`, breadcrumb `nav` got `min-w-0 truncate`, `header-search.tsx` button got `min-w-0 shrink`. Verified no horizontal overflow at 1200/1024/900/768/640.

## TODO
- _(none)_ — admin chrome (sidebar/topbar) landed; flat-restyled (see "Admin flat restyle").

## ADR
_(none yet)_
