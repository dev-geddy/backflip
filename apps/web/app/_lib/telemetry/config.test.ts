import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { telemetryHash, telemetryIngestEnabled, utcDay } from "./config"

const SALT = "test-salt"
let original: string | undefined

beforeEach(() => {
  original = process.env.TELEMETRY_HASH_SALT
  process.env.TELEMETRY_HASH_SALT = SALT
})

afterEach(() => {
  if (original === undefined) delete process.env.TELEMETRY_HASH_SALT
  else process.env.TELEMETRY_HASH_SALT = original
})

describe("telemetryIngestEnabled", () => {
  it("is off without a salt, so a fork stores nothing by default", () => {
    delete process.env.TELEMETRY_HASH_SALT
    expect(telemetryIngestEnabled()).toBe(false)
    expect(telemetryHash("install", "abc")).toBeNull()
  })

  it("is off for a blank salt", () => {
    process.env.TELEMETRY_HASH_SALT = "   "
    expect(telemetryIngestEnabled()).toBe(false)
  })
})

describe("telemetryHash", () => {
  it("is stable for the same value, so one install stays one row", () => {
    expect(telemetryHash("install", "abc")).toBe(
      telemetryHash("install", "abc")
    )
  })

  it("never returns the raw value", () => {
    expect(telemetryHash("ip", "203.0.113.9")).not.toContain("203.0.113.9")
  })

  it("separates the install and ip keyspaces", () => {
    expect(telemetryHash("install", "abc")).not.toBe(telemetryHash("ip", "abc"))
  })

  it("changes with the salt, so rotating it unlinks old hashes", () => {
    const before = telemetryHash("install", "abc")
    process.env.TELEMETRY_HASH_SALT = "another-salt"
    expect(telemetryHash("install", "abc")).not.toBe(before)
  })

  it("is a 32-char hex digest", () => {
    expect(telemetryHash("install", "abc")).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe("utcDay", () => {
  it("buckets by UTC calendar day regardless of local zone", () => {
    expect(utcDay(new Date("2026-09-02T23:59:59.000Z"))).toBe("2026-09-02")
    expect(utcDay(new Date("2026-09-03T00:00:01.000Z"))).toBe("2026-09-03")
  })
})
