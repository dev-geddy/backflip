import { expect, test, type Page } from "@playwright/test"

import { OWNER } from "./env"

/**
 * Admin content cap (`L2-UI-61`) — page content stops at 1440px and centres in
 * the canvas; the canvas, header and sidebar stay full-bleed.
 *
 * The number is asserted in pixels on purpose: the shell states it in px
 * precisely because the base scale is 17px, so a rem value would silently
 * become 1530.
 */

const CAP = 1440

async function loginAsOwner(page: Page) {
  await page.goto("/backflip/login")
  await page.getByLabel("Email").fill(OWNER.email)
  await page.getByLabel("Password").fill(OWNER.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/backflip")
}

/** The capped wrapper: the canvas's only child. */
function content(page: Page) {
  return page.locator('[data-slot="sidebar-inset"] > div > div').first()
}

test.describe("wide viewport", () => {
  test.use({ viewport: { width: 1920, height: 900 } })

  test("content stops at 1440px and is centred in a full-bleed canvas", async ({
    page,
  }) => {
    await loginAsOwner(page)

    const box = (await content(page).boundingBox())!
    expect(box.width).toBe(CAP)

    // Equal gutters — centred, not merely capped and left-aligned.
    const canvas = (await page
      .locator('[data-slot="sidebar-inset"] > div')
      .first()
      .boundingBox())!
    const left = box.x - canvas.x
    const right = canvas.x + canvas.width - (box.x + box.width)
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1)

    // The canvas itself still reaches the window edge, so the ground behind
    // the content is uninterrupted.
    expect(canvas.x + canvas.width).toBeCloseTo(1920, 0)

    // A master-detail page is capped the same way.
    await page.goto("/backflip/settings")
    expect((await content(page).boundingBox())!.width).toBe(CAP)
  })
})

test.describe("narrow viewport", () => {
  test.use({ viewport: { width: 1200, height: 800 } })

  test("content fills the canvas below the cap", async ({ page }) => {
    await loginAsOwner(page)

    const box = (await content(page).boundingBox())!
    const canvas = (await page
      .locator('[data-slot="sidebar-inset"] > div')
      .first()
      .boundingBox())!
    expect(box.width).toBeLessThan(CAP)
    expect(box.width).toBeCloseTo(canvas.width, 0)
  })
})
