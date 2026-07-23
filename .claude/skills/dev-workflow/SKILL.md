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

## Working directory
- All work stays in the project dir. No `/tmp` or other scratch/system dirs for logs, output, or intermediate files — use the project (e.g. `.next`, ignored paths) instead.
- No workaround commands / shims. Fix the real thing. (See "Package manager" below.)
- Look outside the project only when explicitly asked.

## Package manager — ALWAYS corepack yarn
- Pinned: `yarn@4.17.1` (`packageManager` in root `package.json`). Berry, not classic.
- **Always prefix `corepack`**: `corepack yarn <cmd>`. Bare `yarn` on this machine = classic 1.22, refuses.
- User rejected PATH/shim workarounds. No exceptions.
- Root `yarn.lock` marker present so berry treats repo as standalone (parent `~/` is another yarn project).

## Run the app
- Dev (web app): `corepack yarn workspace web dev` → **port 3070**.
- All workspaces dev (turbo): `corepack yarn dev`.
- Prod: `corepack yarn workspace web build` then `corepack yarn workspace web start`.

## Docker + database
- **Preferred dev flow: app local, db in Docker.** Run app via `corepack yarn dev` (port 3070, hot reload); run only postgres in Docker.
  - First time: `cp .env.example .env`.
  - `docker compose up -d db` → postgres on `localhost:${POSTGRES_PORT:-5544}`.
  - `corepack yarn dev` → app on 3070, reads `DATABASE_URL` from `.env`.
- Full Docker (app + db): `docker compose up --build` → app on **3071** (containerized prod build), db as above. In-container app connects to db at `db:5432`.
- Postgres host port default **5544** (env `POSTGRES_PORT`), kept off 5432 to avoid clashes. Change in `.env` if it collides.
- Creds: `.env` (gitignored) — copy of `.env.example` (committed template). Same values seed the db container and are read by the local app.
- Files: `docker-compose.yml`, `apps/web/Dockerfile`, `.dockerignore`. See `README.md`.

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

## UX conventions
- Keyboard-first: add shortcuts for common/repeated actions (nav, submit, toggle, close) so users skip the mouse.
- Surface each shortcut visibly with the `kbd` component (`@workspace/ui/components/kbd`) so it's discoverable.
- Use, don't overuse: only high-value/frequent actions. No shortcut for rare/destructive-without-confirm ops. Avoid clashing with browser/OS defaults.
- Explanations: use `hover-card` (`@workspace/ui/components/hover-card`) for contextual detail/definitions where helpful — keep inline UI clean, reveal depth on hover. Don't overuse.

## Stack
Next.js 16.2.6 · React 19.2.4 · TypeScript 5 · Tailwind v4 · shadcn/ui · Turborepo · yarn 4.17.1.
