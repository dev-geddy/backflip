import { expect, test, type Page } from "@playwright/test"

import { OWNER } from "./env"

/**
 * Integrations credentials — a stored key is not an editable field, it is a
 * masked row with `Replace` and a confirmed `Remove` (`L2-AI-23`), and the
 * model list only ever shows what the provider itself returned (`L2-AI-24`).
 *
 * The key pasted here is deliberately invalid, which is also the point of the
 * model assertion: a rejected key must leave the list empty rather than fall
 * back to a built-in catalog that looks live.
 */

async function loginAsOwner(page: Page) {
  await page.goto("/backflip/login")
  await page.getByLabel("Email").fill(OWNER.email)
  await page.getByLabel("Password").fill(OWNER.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/backflip")
}

async function openAiIntegration(page: Page) {
  await page.goto("/backflip/settings")
  await page
    .getByRole("button", { name: /AI providers/ })
    .first()
    .click()
}

test("a stored API key is read-only, removable, and gates the model list", async ({
  page,
}) => {
  await loginAsOwner(page)
  await openAiIntegration(page)

  const keyField = page.locator("#key-anthropic")

  // The suite's database survives between runs, so start from "no key" rather
  // than assuming it.
  if (
    await page.getByRole("button", { name: "Remove", exact: true }).isVisible()
  ) {
    await page.getByRole("button", { name: "Remove", exact: true }).click()
    await page.getByRole("button", { name: "Remove key" }).click()
    await expect(keyField).toBeVisible()
  }

  // 1. No key yet → an editable field, no removal affordance, no model list.
  await expect(keyField).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Remove", exact: true })
  ).toHaveCount(0)
  await expect(page.getByText("Available models")).toHaveCount(0)
  await expect(
    page.getByText("The provider lists its own models once a key is saved.")
  ).toBeVisible()

  // 2. Save a key → the field is replaced by a masked, read-only row.
  await keyField.fill("sk-ant-not-a-real-key-0000")
  await page.getByRole("button", { name: "Save changes" }).click()

  await expect(page.locator("#key-anthropic")).toHaveCount(0)
  await expect(page.getByText(/^sk-•+0000$/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Replace" })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Remove", exact: true })
  ).toBeVisible()

  // 3. The provider rejects the key → no models are invented to fill the gap.
  await expect(page.getByText("Available models")).toBeVisible()
  await expect(page.getByText("provider list unavailable")).toBeVisible()
  await expect(
    page.getByText(/Only the provider can say which models/)
  ).toBeVisible()
  await expect(page.locator("#model-anthropic")).toBeDisabled()

  // 4. Replace re-opens an empty field, and backing out keeps the stored key.
  await page.getByRole("button", { name: "Replace" }).click()
  await expect(page.locator("#key-anthropic")).toHaveValue("")
  await page.getByRole("button", { name: "Keep the current key" }).click()
  await expect(page.locator("#key-anthropic")).toHaveCount(0)

  // 5. Remove asks first, then actually clears the key.
  await page.getByRole("button", { name: "Remove", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: /Remove the .* key\?/ })
  ).toBeVisible()
  await page.getByRole("button", { name: "Cancel" }).click()
  await expect(
    page.getByRole("button", { name: "Remove", exact: true })
  ).toBeVisible()

  await page.getByRole("button", { name: "Remove", exact: true }).click()
  await page.getByRole("button", { name: "Remove key" }).click()

  await expect(page.locator("#key-anthropic")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Remove", exact: true })
  ).toHaveCount(0)
  await expect(page.getByText("Available models")).toHaveCount(0)
})

test("the open pane and AI provider survive a reload", async ({ page }) => {
  await loginAsOwner(page)
  await page.goto("/backflip/settings")

  // Master list → the URL names the pane.
  await page.getByRole("button", { name: /Slack/ }).first().click()
  await expect(page).toHaveURL(/[?&]integration=slack/)
  await page.reload()
  await expect(
    page.getByText("Incoming webhooks", { exact: true })
  ).toBeVisible()

  // AI tabs → the URL names the provider too, and a reload keeps that tab.
  await page.goto("/backflip/settings?integration=ai")
  await page.getByRole("button", { name: "OpenAI" }).click()
  await expect(page).toHaveURL(/provider=openai/)
  await page.reload()
  await expect(page.locator("#key-openai")).toBeVisible()

  // A junk value falls back to the first pane instead of rendering nothing.
  await page.goto("/backflip/settings?integration=nope&provider=nope")
  await expect(
    page.getByRole("heading", { name: "AI providers" })
  ).toBeVisible()
  await expect(page.locator("#key-anthropic")).toBeVisible()
})
