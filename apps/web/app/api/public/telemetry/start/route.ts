import { NextResponse } from "next/server"

import { clientIp } from "@/app/_lib/client-ip"
import {
  MAX_BODY_BYTES,
  telemetryIngestEnabled,
} from "@/app/_lib/telemetry/config"
import {
  ingestBurstLimiter,
  ingestDailyLimiter,
  newInstallLimiter,
} from "@/app/_lib/telemetry/limits"
import { parseStartReport } from "@/app/_lib/telemetry/payload"
import { recordStart } from "@/app/_lib/telemetry/record"

// Uses pg (db) — Node runtime. `force-dynamic` keeps it out of the build-time
// prerender pass; nothing here is cacheable anyway.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" } as const

/** Accepted, ignored, malformed, over-budget — the client cannot tell apart. */
function accepted(): NextResponse {
  return new NextResponse(null, { status: 204, headers: NO_STORE })
}

/**
 * POST /api/public/telemetry/start — the one telemetry surface. Receives a
 * start report from `scripts/track-start.mjs` when someone runs `yarn dev` on
 * a checkout of this project.
 *
 * Unauthenticated by necessity: the client is a plain Node script in a public
 * repository, so it holds no secret worth checking. Defense is therefore about
 * cost and recoverability, in this order:
 *
 *  1. No salt configured → nothing is stored at all (a fork collects nothing).
 *  2. Burst budget per IP, spent before the body is read.
 *  3. Daily budget per IP, with a much tighter nested budget for reports that
 *     would create a new install row — the number worth forging.
 *  4. Strict payload validation, including a version that must plausibly exist.
 *  5. Per-install minimum interval and daily cap, applied in `recordStart`.
 *  6. Every stored row is attributable to an install that can be marked
 *     `ignored` later, so inflated data can be removed after the fact.
 *
 * Every non-throttled path answers `204` with no body. Rejections are silent on
 * purpose: a prober learns nothing about which rule it tripped, and an honest
 * client has nothing to do with the answer either way. `429` is the single
 * exception, because a rate limit is the one condition worth telling a
 * well-behaved client about.
 *
 * @spec L2-TELEMETRY-09
 */
export async function POST(request: Request) {
  // A deployment with no ingest salt is not collecting telemetry. Answer
  // exactly as it would on success so a fork's endpoint is not a probe target.
  if (!telemetryIngestEnabled()) return accepted()

  const ip = clientIp(request)

  if (ingestBurstLimiter.blocked(ip)) {
    return new NextResponse(null, {
      status: 429,
      headers: {
        "Retry-After": String(
          Math.max(1, Math.ceil(ingestBurstLimiter.retryAfterMs(ip) / 1000))
        ),
        ...NO_STORE,
      },
    })
  }
  ingestBurstLimiter.hit(ip)

  if (ingestDailyLimiter.blocked(ip)) return accepted()

  // Cheap shape gates before any parsing: the content type the shipped client
  // sends, and a body no larger than a well-formed report can be.
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.startsWith("application/json")) return accepted()

  const declared = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return accepted()

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return accepted()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return accepted()
  }

  const report = parseStartReport(parsed)
  if (!report) return accepted()

  try {
    const outcome = await recordStart({
      report,
      ip,
      allowNewInstall: !newInstallLimiter.blocked(ip),
    })

    // Budget is spent by effect, not by request: only a report that actually
    // created an install row costs new-install budget.
    if (outcome === "created") newInstallLimiter.hit(ip)
    if (outcome === "created" || outcome === "bumped")
      ingestDailyLimiter.hit(ip)
  } catch {
    // A telemetry write must never surface as an error to a dev server that is
    // only trying to start. Swallow and answer as usual.
  }

  return accepted()
}
