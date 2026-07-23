# Notes (L3) — ui

> L3 = how / volatile. AI writes free. Cites L2 IDs up. Matches code as-is.

## File map
- `packages/ui/src/components/*.tsx` — shadcn component set. Satisfies `L2-UI-01`.
- `packages/ui/src/lib/utils.ts` — `cn()`. Satisfies `L2-UI-02`.
- `packages/ui/src/styles/globals.css` — theme tokens. Satisfies `L2-UI-03`.
- `packages/ui/components.json` — shadcn config. Satisfies `L2-UI-06`, `L2-UI-07`.
- `apps/web/app/layout.tsx` — mounts ThemeProvider + TooltipProvider + Toaster. Satisfies `L2-UI-04`, `L2-UI-09`.
- `apps/web/app/styleguide/page.tsx` — component demo, `d` = dark toggle. Satisfies `L2-UI-05`, `L2-UI-12`.
- `apps/web/next.config.ts` — `transpilePackages: ["@workspace/ui"]`. Satisfies `L2-UI-10`.

## Installed components (31)
accordion, alert, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, checkbox,
dialog, dropdown-menu, input, label, popover, progress, radio-group, scroll-area, select,
separator, skeleton, slider, sonner, switch, table, tabs, textarea, toggle, tooltip.

## Deps added for components
- `sonner` — toast (needs `<Toaster/>`).
- `react-day-picker` + `date-fns` — calendar.

## Deviations
- none known.

## TODO
- Admin chrome (sidebar/topbar) once auth lands — will consume these components.

## ADR
_(none yet)_
