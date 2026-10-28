/**
 * Next.js server-start hook. Reports one anonymous start to the upstream
 * project on every server start — `next dev`, `next start` and the standalone
 * `server.js` alike. Fire-and-forget: startup never waits on it.
 *
 * @spec L2-TELEMETRY-10
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  if (process.env.NEXT_PHASE === "phase-production-build") return
  try {
    const { reportStart } = await import("./app/_lib/telemetry/report-start")
    void reportStart()
  } catch {
    // Never let telemetry fail startup.
  }
}
