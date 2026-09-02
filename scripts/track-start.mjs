#!/usr/bin/env node
/**
 * Anonymous start telemetry for the Backflip starter.
 *
 * Runs once per `corepack yarn dev`, in the background, and reports that this
 * checkout started to the upstream project. It is how the maintainer sees that
 * the starter is being used at all — there is no other signal, since every
 * install runs on someone else's machine.
 *
 * What is sent: a random install id generated on first run, the app version,
 * `process.platform`, and the Node major. Nothing else — no hostname, no user,
 * no paths, no repository remote, no project contents. The receiving end stores
 * the install id and the source IP only as salted hashes.
 *
 * Turn it off with `BACKFLIP_TELEMETRY=off` in `.env.local` (or in the
 * environment). Off means this script exits before any network call.
 *
 * Never blocks or fails the dev server: one request, short timeout, every
 * error swallowed.
 *
 * @spec L2-TELEMETRY-10, L2-TELEMETRY-11
 */
import { randomUUID } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const STATE_DIR = join(ROOT, ".backflip")
const INSTALL_ID_FILE = join(STATE_DIR, "install-id")
const DEFAULT_ENDPOINT =
  "https://backflip.dev-geddy.com/api/public/telemetry/start"
const TIMEOUT_MS = 1500

/**
 * Read one key out of the repo's env files. The dev server loads them through
 * dotenv-cli, but this script runs beside that, not inside it — so the opt-out
 * has to be readable without any dependency. Later files win, matching the
 * order the app loads them in.
 */
function envValue(key) {
  if (process.env[key]) return process.env[key]
  let found
  for (const file of [".env", ".env.local"]) {
    let text
    try {
      text = readFileSync(join(ROOT, file), "utf8")
    } catch {
      continue
    }
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (match && match[1] === key) {
        found = match[2].replace(/^["']|["']$/g, "").trim()
      }
    }
  }
  return found
}

function optedOut() {
  const value = (envValue("BACKFLIP_TELEMETRY") ?? "").toLowerCase()
  return value === "off" || value === "false" || value === "0"
}

/**
 * Stable per-checkout id, created on first run. Lives in gitignored
 * `.backflip/` so it never travels with a clone — a fork is a new install, and
 * two people sharing a repo are not one.
 */
function installId() {
  try {
    const existing = readFileSync(INSTALL_ID_FILE, "utf8").trim()
    if (existing) return { id: existing, fresh: false }
  } catch {
    // No id yet — fall through and mint one.
  }
  const id = randomUUID()
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(INSTALL_ID_FILE, `${id}\n`, { mode: 0o600 })
  return { id, fresh: true }
}

function appVersion() {
  try {
    return JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version
  } catch {
    return "0.0.0"
  }
}

function printNotice() {
  process.stdout.write(
    [
      "",
      "  Backflip sends one anonymous ping per `yarn dev` (install id, version,",
      "  OS, Node major) so the project can count real-world use.",
      "  Opt out any time: add BACKFLIP_TELEMETRY=off to .env.local",
      "",
    ].join("\n") + "\n"
  )
}

async function main() {
  if (optedOut()) return

  const { id, fresh } = installId()
  if (fresh) printNotice()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    await fetch(envValue("BACKFLIP_TELEMETRY_ENDPOINT") || DEFAULT_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        installId: id,
        appVersion: appVersion(),
        platform: process.platform,
        nodeMajor: Number(process.versions.node.split(".")[0]),
      }),
      signal: controller.signal,
    })
  } catch {
    // Offline, endpoint down, DNS blocked — all fine. Telemetry is never
    // allowed to be the reason a dev server did not start.
  } finally {
    clearTimeout(timer)
  }
}

await main()
