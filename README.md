# backflip

A full-stack **platform foundation** for kicking off new projects fast — auth, admin dashboard, database, and UI system already wired, so you build features instead of boilerplate.

Stack: Next.js 16 · React 19 · Tailwind v4 · shadcn/ui · Drizzle + Postgres · Auth.js · Turborepo · yarn 4.

> **Self-hosted starter.** You run this yourself and supply your own secrets. The values in `.env.example` are local-dev defaults only — generate real secrets before deploying anywhere (see [Security](#security)).

## Prerequisites
- **Docker Desktop** (running) — for Postgres
- **Node ≥ 20** with **corepack** (pins `yarn@4.17.1` — always run `corepack yarn …`)

## Run it locally

**1. Create env files (first time only).** Copy the templates:
```bash
cp .env.example .env
cp .env.init.example .env.init      # one-off owner seed — see step 2
```
Create **`.env.local`** (runtime Auth.js secrets) with:
```
AUTH_SECRET=replace-with-openssl-rand-base64-33
AUTH_TRUST_HOST=true
```
Generate a real secret with `openssl rand -base64 33`. Edit **`.env.init`** with your
`ADMIN_EMAIL` / `ADMIN_PASSWORD` — it's read only by `init-owner`, never by the app,
and can be deleted once the owner is seeded.

**2. Install, set up the database, run:**
```bash
corepack yarn install
docker compose up -d db      # start Postgres (Docker)
corepack yarn db:migrate     # create tables
corepack yarn init-owner     # seed admin from .env.init
corepack yarn dev            # app → http://localhost:3070
```

## Log in
- Sign in at **http://localhost:3070/backflip/login** with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- **After editing env:**
  - changed `ADMIN_*` in `.env.init` → rerun `corepack yarn init-owner`
  - changed `AUTH_*` (incl. Google) in `.env.local` → **restart `yarn dev`** (env loads at startup)
- Google login is optional — add `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (redirect URI `http://localhost:3070/api/auth/callback/google`); works only for already-registered emails.

## Production: seed the owner once, then remove it
The owner seed is a **one-off kickoff step**. Run it a single time against the prod
database, then delete both the credentials file and the seed tooling so nothing
admin-related ships or lingers in the deployed app.

**1. Run once** (migrations already applied, `.env` pointing at the prod db):
```bash
cp .env.init.example .env.init   # then edit: real ADMIN_EMAIL + a strong ADMIN_PASSWORD
corepack yarn init-owner         # creates the owner row — idempotent, safe to re-run
```
Confirm you can sign in at `/backflip/login`, then tear it down.

**2. Remove the file + script** (nothing here is needed at runtime):
```bash
rm .env.init                                       # the secret (gitignored — never committed)

# Delete the one-off seed tooling:
git rm .env.init.example packages/db/src/seed/owner.ts
```
Then drop the `init-owner` script entry from **`package.json`** and
**`packages/db/package.json`**, and commit. (The app never imports this code, so
removing it is safe; prune the matching `L2-DB-04/13/15` doc lines if you keep docs
in sync.) To seed another owner later, restore the two files from git history.

## Good to know
- **Ports**: app `3070`, Postgres `5544` (change `POSTGRES_PORT` in `.env` if it clashes).
- **Secrets**: set a real `ENCRYPTION_KEY` in `.env` (`openssl rand -base64 32`) — it encrypts stored secrets (AI provider keys).
- **DB changes**: edit `packages/db/src/schema.ts` → `corepack yarn db:generate` → `db:migrate`.
- **Admin dashboard UI** is built from shadcn blocks — browse and lift components/layouts from **https://ui.shadcn.com/blocks** (this project uses `login-03`, `dashboard-01`, `sidebar-08`).
- **Full Docker** (app + db): `docker compose up --build` → app on `3071`.
- More commands + conventions: `.claude/skills/dev-workflow`.

## Security
Before deploying, generate real secrets — never reuse the `.env.example` defaults:
- `AUTH_SECRET` → `openssl rand -base64 33`
- `ENCRYPTION_KEY` → `openssl rand -base64 32`
- a strong `ADMIN_PASSWORD` and unique database credentials.

To report a vulnerability, see [`SECURITY.md`](./SECURITY.md).

## License
[MIT](./LICENSE) © dev-geddy
