import { z } from "zod"

/**
 * Shape of a telemetry start report, and the plausibility checks applied before
 * anything is written.
 *
 * The endpoint is unauthenticated and the client that posts to it ships in a
 * public repository, so nothing here can *prove* a report is genuine — no
 * client-side secret survives being published. What validation buys is cost:
 * every rule below is one more thing a forger has to get right, and together
 * they eliminate the whole class of drive-by scanners and one-line curl loops
 * that would otherwise be the realistic threat.
 *
 * @spec L2-TELEMETRY-06
 */

/**
 * This build's version — the same `NEXT_PUBLIC_APP_VERSION` the footer renders
 * (`L2-UI-19`), read from the env rather than imported from that component so
 * this module stays free of JSX and testable under the node environment.
 */
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"

/**
 * `process.platform` values worth recording. An unknown platform is rejected
 * rather than stored: this is a fixed, small enum in Node, so a value outside
 * it did not come from the shipped client.
 */
export const PLATFORMS = [
  "aix",
  "android",
  "darwin",
  "freebsd",
  "haiku",
  "linux",
  "openbsd",
  "sunos",
  "win32",
] as const

/** Node majors plausible for a repo that requires `>=20`. */
const MIN_NODE_MAJOR = 18
const MAX_NODE_MAJOR = 40

const SEMVER = /^\d{1,3}\.\d{1,4}\.\d{1,4}$/

export const startReportSchema = z.strictObject({
  installId: z.uuid(),
  appVersion: z.string().regex(SEMVER),
  platform: z.enum(PLATFORMS),
  nodeMajor: z.number().int().min(MIN_NODE_MAJOR).max(MAX_NODE_MAJOR),
})

export type StartReport = z.infer<typeof startReportSchema>

/**
 * Whether `version` could plausibly have been produced by a real checkout.
 *
 * A report claiming a major above the one this server is running describes a
 * release that does not exist yet — the strongest cheap forgery tell available,
 * since a forger has to track our releases to stay under it. Older majors stay
 * valid indefinitely: someone running a year-old clone is exactly who we want
 * to count.
 *
 * `current` defaults to this build's version. When that is the `"0.0.0"`
 * placeholder (any context without the inlined `NEXT_PUBLIC_APP_VERSION`, such
 * as a unit test) the check is skipped rather than rejecting everything — an
 * unknown ceiling is not evidence of forgery.
 */
export function plausibleVersion(
  version: string,
  current: string = APP_VERSION
): boolean {
  if (current === "0.0.0") return true
  const claimed = Number(version.split(".")[0])
  const ceiling = Number(current.split(".")[0])
  if (!Number.isFinite(claimed) || !Number.isFinite(ceiling)) return false
  return claimed <= ceiling
}

/** Parse + plausibility in one step. Returns null on anything suspect. */
export function parseStartReport(
  input: unknown,
  current: string = APP_VERSION
): StartReport | null {
  const parsed = startReportSchema.safeParse(input)
  if (!parsed.success) return null
  if (!plausibleVersion(parsed.data.appVersion, current)) return null
  return parsed.data
}
