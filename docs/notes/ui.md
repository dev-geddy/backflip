# Notes (L3) — ui

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `packages/ui/src/components/*.tsx` — shadcn component set. Satisfies `L2-UI-01`.
- `packages/ui/src/lib/utils.ts` — `cn()`. Satisfies `L2-UI-02`.
- `packages/ui/src/styles/globals.css` — theme tokens + Tailwind `@source` globs. Satisfies `L2-UI-03`. `@source` paths are relative to this file (4 levels up = repo root): `../../../../apps/**`, `../../../../components/**`, `../**` (packages/ui itself). All consumer `.tsx` must be covered or their utility classes aren't generated.
- `packages/ui/components.json` — shadcn config. Satisfies `L2-UI-06`, `L2-UI-07`.
- `apps/web/app/layout.tsx` — mounts ThemeProvider + TooltipProvider + Toaster. Satisfies `L2-UI-04`, `L2-UI-09`.
- `apps/web/app/page.tsx` — root landing. Centered low-contrast large "backflip" wordmark + nav links: Admin → `/backflip`, UI Samples → `/ui-samples`.
- `apps/web/app/ui-samples/page.tsx` — component demo (`UISamplesPage`, heading "UI Samples"), dashboard/masonry layout reproducing the `base-mira` create-preview; exercises ~50 components (item, field, input-group, native-select, toggle-group, chart/recharts, empty, spinner, progress, calendar, radio, table, tabs, accordion, …). `d` = dark toggle. Satisfies `L2-UI-05`, `L2-UI-12`. Note: uncontrolled `defaultValue` passed to base-ui ToggleGroup/Slider must be stable module-scope refs (base-ui warns on identity change per render).
- `apps/web/next.config.ts` — `transpilePackages: ["@workspace/ui"]`. Satisfies `L2-UI-10`.

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

## Composition (base-mira / base-ui)
- base-mira components compose via base-ui `useRender` — pass `render={<el/>}` with children as siblings, NOT Radix-style `asChild` + child. E.g. `<SidebarMenuButton render={<a href={url} />}>…</SidebarMenuButton>`, `<Collapsible render={<SidebarMenuItem />}>`, `<DropdownMenuTrigger render={<SidebarMenuButton />}>`.
- When porting shadcn new-york blocks (which use `asChild`), rewrite to `render`. Also map lucide icons → remixicon.

## Fixed
- `@source` globs in globals.css were one level short (`../../../apps` → `packages/apps`, nonexistent). Tailwind never scanned `apps/web`, so app-level utility classes (page layout on `/ui-samples`) weren't generated → page rendered unstyled vs shadcn preview. Corrected to `../../../../` (repo root).

## TODO
- Admin chrome (sidebar/topbar) once auth lands — will consume these components.

## ADR
_(none yet)_
