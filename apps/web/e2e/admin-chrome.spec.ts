import sharp from "sharp"
import { expect, test, type Locator, type Page } from "@playwright/test"

import { OWNER } from "./env"

/**
 * Admin chrome — collapsed ("icon") sidebar rail.
 *
 * Regression guard: the header brand block and the footer user chip both put a
 * `flex-1` label next to their icon. `flex-1` keeps its intrinsic width, so in
 * the 3.5rem rail the label pushed the icon out of the button's overflow box
 * (measured x = -24px for the brand tile) — the mark simply vanished. Labels
 * must leave the flow when collapsed, icon centred inside the rail.
 */

async function loginAsOwner(page: Page) {
  await page.goto("/backflip/login")
  await page.getByLabel("Email").fill(OWNER.email)
  await page.getByLabel("Password").fill(OWNER.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/backflip")
}

async function expectInsideRail(icon: Locator, rail: Locator) {
  const railBox = (await rail.boundingBox())!
  const iconBox = (await icon.boundingBox())!
  expect(iconBox.x).toBeGreaterThanOrEqual(railBox.x)
  expect(iconBox.x + iconBox.width).toBeLessThanOrEqual(
    railBox.x + railBox.width
  )
}

test("collapsed sidebar rail shows icons only", async ({ page }) => {
  await loginAsOwner(page)
  await page.getByRole("button", { name: /toggle sidebar/i }).click()

  const rail = page.locator('[data-slot="sidebar-container"]')
  // settled at --sidebar-width-icon (3.5rem), not mid-transition
  await expect
    .poll(async () => (await rail.boundingBox())!.width)
    .toBeLessThan(80)

  await expect(page.getByText("Admin console")).toBeHidden()
  await expectInsideRail(
    page.locator('[data-slot="sidebar-header"] a svg').first(),
    rail
  )
  await expectInsideRail(
    page.locator('[data-slot="sidebar-footer"] [data-slot="avatar"]').first(),
    rail
  )
})

/**
 * Sidebar↔header seam continuity (`L2-UI-46`).
 *
 * The two halves of the chrome paint slices of ONE ramp, so the colour must not
 * step at the boundary. This has broken twice without anyone noticing: once
 * when each element derived its own gradient (two ramps meeting at a corner),
 * and once when the sidebar re-pointed `--grad-glow` at `var(--sidebar-accent)`
 * and lost the literal's alpha — invisible on the dark palettes, a ~5% L step
 * on every light one. Nothing but a pixel check catches it.
 */

/** Relative luminance (WCAG) of an [r,g,b] triple. */
function luminance([r, g, b]: readonly number[]) {
  const ch = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * ch(r!) + 0.7152 * ch(g!) + 0.0722 * ch(b!)
}

async function pixel(buffer: Buffer, x: number, y: number) {
  const { data } = await sharp(buffer)
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return [data[0]!, data[1]!, data[2]!] as const
}

// One of each tone: the light palettes are where the glow's alpha mattered,
// the dark ones where it hid.
for (const theme of ["Rose Gold", "Aubergine"]) {
  test(`chrome ramp is continuous across the seam — ${theme}`, async ({
    page,
  }) => {
    await loginAsOwner(page)
    await page.goto("/backflip/account")
    await page.getByRole("button", { name: new RegExp(`^${theme}`) }).click()
    await expect(page.getByText("Saving…")).toHaveCount(0, { timeout: 10000 })

    await page.goto("/backflip")
    await expect(
      page.getByRole("heading", { name: /Welcome back/ })
    ).toBeVisible()

    const seamX = await page.evaluate(() => {
      const el = document.querySelector('[data-slot="sidebar-container"]')!
      return Math.round(el.getBoundingClientRect().right)
    })

    const buffer = await page.screenshot()
    const sidebar = await pixel(buffer, seamX - 8, 24)
    const header = await pixel(buffer, seamX + 8, 24)

    // 1% L of slack: the two samples are 16px apart along a real ramp, so they
    // are near-identical but not bit-identical.
    expect(
      Math.abs(luminance(header) - luminance(sidebar)),
      `seam steps: sidebar ${sidebar.join(",")} vs header ${header.join(",")}`
    ).toBeLessThan(0.01)
  })
}
