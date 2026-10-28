import { randomUUID } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

/**
 * Sender side of start telemetry: on every server start (`next dev`,
 * `next start`, standalone `server.js`) post one anonymous report to the
 * upstream project, so it can see that the starter is used at all.
 *
 * Called fire-and-forget from `instrumentation.ts`. It must never block or
 * break startup: one request, a short timeout, every error swallowed.
 *
 * Payload is exactly the four-field `StartReport` shape the receiver's strict
 * schema accepts (`payload.ts`) — install id, app version, platform, Node major.
 *
 * Install id resolution order: the app database (survives blue/green release
 * dirs and container rebuilds) → the gitignored `.backflip/install-id` file →
 * a fresh random id. A start is always reported, even with no persistence.
 *
 * @spec L2-TELEMETRY-10, L2-TELEMETRY-11, L2-TELEMETRY-15, L2-TELEMETRY-38, L2-TELEMETRY-39
 */

export const DEFAULT_ENDPOINT =
  "https://backflip.dev-geddy.com/api/public/telemetry/start"
export const TIMEOUT_MS = 1500

type Env = Record<string, string | undefined>

export type InstallIdStore = {
  /** The persisted id, or null when none exists yet. Throws when unreachable. */
  read(): Promise<string | null>
  /** Persist `id`. Throws when unreachable. */
  write(id: string): Promise<void>
}

export function optedOut(env: Env = process.env): boolean {
  const value = (env.BACKFLIP_TELEMETRY ?? "").trim().toLowerCase()
  return value === "off" || value === "false" || value === "0"
}

/**
 * Resolve the install id through the stores in order. The first store holding
 * an id wins; when a store with none is reachable it is seeded with the id the
 * later stores (or a fresh uuid) yield, so a file-era id carries over into the
 * database the first time it is reachable. Unreachable stores are skipped.
 */
export async function resolveInstallId(
  stores: InstallIdStore[],
  mint: () => string = randomUUID
): Promise<string> {
  const empty: InstallIdStore[] = []
  for (const store of stores) {
    try {
      const id = await withTimeout(store.read(), TIMEOUT_MS)
      if (id) {
        for (const earlier of empty)
          await withTimeout(earlier.write(id), TIMEOUT_MS).catch(() => {})
        return id
      }
      empty.push(store)
    } catch {
      // Unreachable store — try the next one.
    }
  }
  const id = mint()
  for (const store of empty)
    await withTimeout(store.write(id), TIMEOUT_MS).catch(() => {})
  return id
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `.backflip/install-id` — the pre-database location, kept as the fallback. */
export function fileStore(
  files: string[] = [
    join(process.cwd(), ".backflip", "install-id"),
    // Earlier versions wrote it at the repo root (cwd is `apps/web` in dev).
    join(process.cwd(), "..", "..", ".backflip", "install-id"),
  ]
): InstallIdStore {
  return {
    async read() {
      for (const file of files) {
        try {
          const id = readFileSync(file, "utf8").trim()
          if (UUID.test(id)) return id
        } catch {
          // Missing — try the next location.
        }
      }
      return null
    },
    async write(id) {
      mkdirSync(dirname(files[0]!), { recursive: true })
      writeFileSync(files[0]!, `${id}\n`, { mode: 0o600 })
    },
  }
}

/** Single-row `telemetry_identity` table (`L2-DB-38`). */
export function dbStore(): InstallIdStore {
  return {
    async read() {
      const { db, telemetryIdentity } = await import("@workspace/db")
      const { eq } = await import("drizzle-orm")
      const [row] = await db
        .select({ installId: telemetryIdentity.installId })
        .from(telemetryIdentity)
        .where(eq(telemetryIdentity.kind, "install"))
        .limit(1)
      return row?.installId ?? null
    },
    async write(id) {
      const { db, telemetryIdentity } = await import("@workspace/db")
      await db
        .insert(telemetryIdentity)
        .values({ kind: "install", installId: id })
        .onConflictDoNothing()
    },
  }
}

/** Bound each store call: an unreachable database must not stall the report. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms)
  })
  return Promise.race([work, limit]).finally(() => clearTimeout(timer))
}

export type ReportDeps = {
  env?: Env
  fetch?: typeof fetch
  stores?: InstallIdStore[]
  version?: string
}

/** Send one start report. Resolves quietly on every outcome; never throws. */
export async function reportStart(deps: ReportDeps = {}): Promise<void> {
  try {
    const env = deps.env ?? process.env
    if (optedOut(env)) return

    const installId = await resolveInstallId(
      deps.stores ?? [dbStore(), fileStore()]
    )

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      await (deps.fetch ?? fetch)(
        env.BACKFLIP_TELEMETRY_ENDPOINT || DEFAULT_ENDPOINT,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            installId,
            appVersion:
              deps.version ?? process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
            platform: process.platform,
            nodeMajor: Number(process.versions.node.split(".")[0]),
          }),
          signal: controller.signal,
        }
      )
    } finally {
      clearTimeout(timer)
    }
  } catch {
    // Offline, endpoint down, DNS blocked — all fine. Telemetry is never
    // allowed to be the reason a server did not start.
  }
}
