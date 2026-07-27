import path from "node:path"
import { fileURLToPath } from "node:url"

import { config } from "dotenv"

// Repo root = four levels up from packages/db/src/seed.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..")

// One-off owner seed env: `.env` (db creds → DATABASE_URL) + `.env.init` (admin
// seed: ADMIN_EMAIL/ADMIN_PASSWORD). Kept OUT of `.env.local` so the admin
// password is never injected into the running app (dev script + docker only load
// `.env` + `.env.local`). Later files win; missing files are ignored.
config({ path: [path.join(root, ".env"), path.join(root, ".env.init")] })
