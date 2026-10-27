import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

import { startReportSchema } from "./payload"
import {
  fileStore,
  optedOut,
  reportStart,
  resolveInstallId,
  type InstallIdStore,
} from "./report-start"

// @spec L2-TELEMETRY-30

const A = "11111111-1111-4111-8111-111111111111"
const B = "22222222-2222-4222-8222-222222222222"
const MINTED = "33333333-3333-4333-8333-333333333333"

function memory(initial: string | null) {
  const store = {
    value: initial,
    writes: [] as string[],
    async read() {
      return store.value
    },
    async write(id: string) {
      store.value = id
      store.writes.push(id)
    },
  }
  return store
}

const broken: InstallIdStore = {
  async read() {
    throw new Error("down")
  },
  async write() {
    throw new Error("down")
  },
}

describe("optedOut", () => {
  it.each(["off", "OFF", "false", "0", " off "])("%s opts out", (v) => {
    expect(optedOut({ BACKFLIP_TELEMETRY: v })).toBe(true)
  })
  it.each([undefined, "", "on", "1", "true"])("%s keeps it on", (v) => {
    expect(optedOut({ BACKFLIP_TELEMETRY: v })).toBe(false)
  })
})

describe("resolveInstallId", () => {
  it("prefers the first store", async () => {
    const db = memory(A)
    const file = memory(B)
    expect(await resolveInstallId([db, file], () => MINTED)).toBe(A)
    expect(db.writes).toEqual([])
  })

  it("falls back to the next store and seeds the empty earlier one", async () => {
    const db = memory(null)
    const file = memory(B)
    expect(await resolveInstallId([db, file], () => MINTED)).toBe(B)
    expect(db.value).toBe(B)
  })

  it("skips an unreachable store and uses the file", async () => {
    expect(await resolveInstallId([broken, memory(B)], () => MINTED)).toBe(B)
  })

  it("mints and persists to every reachable store when none has an id", async () => {
    const db = memory(null)
    const file = memory(null)
    expect(await resolveInstallId([db, file], () => MINTED)).toBe(MINTED)
    expect(db.value).toBe(MINTED)
    expect(file.value).toBe(MINTED)
  })

  it("still returns a fresh id when nothing is reachable", async () => {
    expect(await resolveInstallId([broken, broken], () => MINTED)).toBe(MINTED)
  })
})

describe("fileStore", () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
  })

  it("round-trips an id and rejects garbage", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bf-telemetry-"))
    dirs.push(dir)
    const file = join(dir, ".backflip", "install-id")
    const store = fileStore([file])
    expect(await store.read()).toBeNull()
    await store.write(A)
    expect(readFileSync(file, "utf8").trim()).toBe(A)
    expect(await store.read()).toBe(A)
    writeFileSync(file, "not-a-uuid\n")
    expect(await store.read()).toBeNull()
  })
})

describe("reportStart", () => {
  it("posts exactly the four-field payload the receiver accepts", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    await reportStart({
      env: { BACKFLIP_TELEMETRY_ENDPOINT: "http://127.0.0.1:1/x" },
      fetch: fetchMock as unknown as typeof fetch,
      stores: [memory(A)],
      version: "1.2.3",
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe("http://127.0.0.1:1/x")
    expect(init.method).toBe("POST")
    const body = JSON.parse(init.body as string)
    expect(Object.keys(body).sort()).toEqual([
      "appVersion",
      "installId",
      "nodeMajor",
      "platform",
    ])
    expect(startReportSchema.safeParse(body).success).toBe(true)
    expect(body.installId).toBe(A)
  })

  it("makes no request and touches no store when opted out", async () => {
    const fetchMock = vi.fn()
    const store = memory(null)
    await reportStart({
      env: { BACKFLIP_TELEMETRY: "off" },
      fetch: fetchMock as unknown as typeof fetch,
      stores: [store],
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(store.writes).toEqual([])
  })

  it("swallows network errors", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("offline")
    })
    await expect(
      reportStart({
        env: {},
        fetch: fetchMock as unknown as typeof fetch,
        stores: [broken],
      })
    ).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
