import { describe, expect, it } from "vitest"

import { retentionCutoff, START_RETENTION_DAYS } from "./config"

describe("retentionCutoff", () => {
  it("keeps the configured window", () => {
    const now = new Date("2026-09-03T10:15:00.000Z")
    const cutoff = retentionCutoff(now, 30)
    expect(cutoff.toISOString()).toBe("2026-08-04T10:15:00.000Z")
  })

  it("defaults to the retention constant", () => {
    const now = new Date("2026-09-03T00:00:00.000Z")
    const days =
      (now.getTime() - retentionCutoff(now).getTime()) / (24 * 60 * 60_000)
    expect(days).toBe(START_RETENTION_DAYS)
  })

  it("crosses year and leap-day boundaries by calendar date", () => {
    expect(
      retentionCutoff(new Date("2028-03-01T00:00:00.000Z"), 1).toISOString()
    ).toBe("2028-02-29T00:00:00.000Z")
    expect(
      retentionCutoff(new Date("2027-01-01T00:00:00.000Z"), 1).toISOString()
    ).toBe("2026-12-31T00:00:00.000Z")
  })

  it("keeps more than a year, so year-over-year stays available", () => {
    expect(START_RETENTION_DAYS).toBeGreaterThan(365)
  })
})
