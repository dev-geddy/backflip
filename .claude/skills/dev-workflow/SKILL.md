---
name: dev-workflow
description: >
  How to work with the backflip project: package manager, running the dev
  server, build/lint/typecheck/format, adding shadcn components, and monorepo
  layout. Load WHENEVER you run, start, build, test, lint, or install anything
  in this repo, add a dependency or shadcn component, or need a project command.
  Also on: "start the app", "run dev", "how do I run", "yarn", "corepack",
  "add component", "build the project".
---

# dev-workflow

How to operate the backflip monorepo. Terse. Exact commands.

## Package manager — ALWAYS corepack yarn
- Pinned: `yarn@4.17.1` (`packageManager` in root `package.json`). Berry, not classic.
- **Always prefix `corepack`**: `corepack yarn <cmd>`. Bare `yarn` on this machine = classic 1.22, refuses.
- User rejected PATH/shim workarounds. No exceptions.
- Root `yarn.lock` marker present so berry treats repo as standalone (parent `~/` is another yarn project).

## Run the app
- Dev (web app): `corepack yarn workspace web dev` → **port 3070**.
- All workspaces dev (turbo): `corepack yarn dev`.
- Prod: `corepack yarn workspace web build` then `corepack yarn workspace web start`.

## Quality gates (turbo, from repo root)
- Typecheck: `corepack yarn typecheck` (per-app: `corepack yarn workspace web typecheck` → `tsc --noEmit`).
- Lint: `corepack yarn lint`.
- Format: `corepack yarn format` (prettier write).
- Build: `corepack yarn build`.

## Install / add deps
- Install: `corepack yarn install`.
- Add to a workspace: `corepack yarn workspace <name> add <pkg>` (workspaces: `web`, `@workspace/ui`, …).

## Add shadcn components
- `corepack yarn dlx shadcn@latest add <component>`.
- Run under `corepack yarn dlx` so berry prepends itself to the child PATH (shadcn spawns bare `yarn` internally).
- Components land in `packages/ui/src/components/`. Config: `packages/ui/components.json` (style `base-mira`, neutral, remixicon, RSC).

## Monorepo layout
- `apps/*` — deployables. `apps/web` = Next.js 16 app (App Router).
- `packages/*` — shared. `packages/ui` (`@workspace/ui`, design system), `packages/eslint-config`, `packages/typescript-config`.
- Turborepo orchestrates. Web transpiles `@workspace/ui` (`next.config.ts`).

## Code placement
Colocation convention: non-route code → underscore dirs (`_components`, `_hooks`, …), scoped by proximity. See `CLAUDE.md` + `L1-ARCH-07/08`.

## Stack
Next.js 16.2.6 · React 19.2.4 · TypeScript 5 · Tailwind v4 · shadcn/ui · Turborepo · yarn 4.17.1.
