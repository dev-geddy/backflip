# Contract (L2) — ui

> L2 = contract / what. AI proposes, human approves. Cite ≥1 L1.
> Style: terse. One fact per line.

> **Implements L1:** `L1-ARCH-05`, `L1-STACK-05`, `L1-STACK-06`
> **Depends on L2:** none

## Owns
Shared design system: `packages/ui` component library, theme, and the `/ui-samples` demo.

## Interfaces
- `L2-UI-01` — `@workspace/ui/components/*` — shadcn component set. Apps import from here, never fork.
- `L2-UI-02` — `@workspace/ui/lib/utils` → `cn()` — class merge helper.
- `L2-UI-03` — `@workspace/ui/globals.css` — theme tokens (CSS vars), imported once in root layout.
- `L2-UI-04` — Root layout providers: `ThemeProvider` (next-themes), `TooltipProvider`, `Toaster` (sonner). (`apps/web/app/layout.tsx`)
- `L2-UI-05` — Route `/backflip/ui-samples` — admin-only component gallery (auth-gated, second Platform nav item below Overview); renders every component, `d` toggles dark mode. (`apps/web/app/backflip/(protected)/ui-samples/page.tsx`)
- `L2-UI-18` — Routes `/getting-started` (guide index) + `/getting-started/setup-on-digitalocean-droplet` (guided deploy walkthrough) — public. Client-only: operator variables live in component state, never persisted or transmitted, rendered into copyable `devops/` commands. Mirrors `L2-DEVOPS-01`, `L2-DEVOPS-02`, `L2-DEVOPS-06`; command strings must track those. (`apps/web/app/getting-started/…`)

## Schemas
- `L2-UI-06` — shadcn config (`packages/ui/components.json`): style `base-mira`, baseColor `neutral`, RSC on, icons `remixicon`, css vars on.
- `L2-UI-07` — Aliases: components/ui → `@workspace/ui/components`, utils → `@workspace/ui/lib/utils`.

## Invariants
- `L2-UI-08` — One theme source: `packages/ui`. No per-app component copies.
- `L2-UI-09` — Overlay components (tooltip/toast) require their providers mounted in root layout.
- `L2-UI-10` — Web app transpiles `@workspace/ui` (`next.config.ts transpilePackages`).
- `L2-UI-14` — `Button` infers base-ui `nativeButton` from its `render` element: `<button>` → true, any other element → false. Explicit `nativeButton` overrides. Link-buttons (`render={<a/>}` / `render={<Link/>}`) need no extra prop.
- `L2-UI-15` — Shell containers hosting page content are shrinkable (`min-w-0`), so page content never forces the shell wider than its slot.

## Errors
- `L2-UI-11` — Component used without required provider → runtime context error. Mount provider in root layout.

## Acceptance
- `L2-UI-12` — `/ui-samples` renders all components without error; dark toggle works.
- `L2-UI-13` — Any app imports a component via `@workspace/ui/components/*` and it themes correctly.
- `L2-UI-16` — No surface produces page-level horizontal scroll at ≥640px.
- `L2-UI-17` — Public + admin surfaces load with zero console errors/warnings.

## Constrained L3
- `/docs/notes/ui.md`

---
IDs: `L2-UI-<NN>`. Permanent, never renumber.
Change: propose diff + affected-L3 → stop → await human.
