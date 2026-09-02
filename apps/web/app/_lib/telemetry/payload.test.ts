import { describe, expect, it } from "vitest"

import { parseStartReport, plausibleVersion } from "./payload"

const VALID = {
  installId: "3f1c8b0e-6a4d-4f2b-9c7e-1d2a3b4c5d6e",
  appVersion: "1.10.0",
  platform: "darwin",
  nodeMajor: 22,
}

describe("parseStartReport", () => {
  it("accepts a report from the shipped client", () => {
    expect(parseStartReport(VALID, "2.0.0")).toEqual(VALID)
  })

  it.each([
    ["a non-uuid install id", { installId: "install-1" }],
    ["a non-semver version", { appVersion: "latest" }],
    ["an unknown platform", { platform: "plan9" }],
    ["an implausible node major", { nodeMajor: 99 }],
    ["a string node major", { nodeMajor: "22" }],
  ])("rejects %s", (_label, patch) => {
    expect(parseStartReport({ ...VALID, ...patch }, "2.0.0")).toBeNull()
  })

  it("rejects unknown fields rather than dropping them", () => {
    // Strict object: an extra key means the sender is not the shipped client,
    // which is more interesting than the key itself.
    expect(
      parseStartReport({ ...VALID, hostname: "laptop" }, "2.0.0")
    ).toBeNull()
  })

  it("rejects a version from a release that does not exist yet", () => {
    expect(
      parseStartReport({ ...VALID, appVersion: "9.0.0" }, "2.0.0")
    ).toBeNull()
  })

  it("rejects non-objects", () => {
    expect(parseStartReport(null, "2.0.0")).toBeNull()
    expect(parseStartReport("1", "2.0.0")).toBeNull()
  })
})

describe("plausibleVersion", () => {
  it("accepts the current major and every older one", () => {
    expect(plausibleVersion("2.4.1", "2.0.0")).toBe(true)
    expect(plausibleVersion("1.0.0", "2.0.0")).toBe(true)
    expect(plausibleVersion("0.1.0", "2.0.0")).toBe(true)
  })

  it("rejects a major above the running build", () => {
    expect(plausibleVersion("3.0.0", "2.0.0")).toBe(false)
  })

  it("skips the check when this build's version is unknown", () => {
    expect(plausibleVersion("9.9.9", "0.0.0")).toBe(true)
  })
})
