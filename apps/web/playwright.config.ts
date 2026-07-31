import { defineConfig, devices } from "@playwright/test"

import { BASE_URL, PORT_APP, TEST_DATABASE_URL } from "./e2e/env"

/**
 * E2E config. `globalSetup` recreates + migrates + seeds a dedicated
 * `backflip_test` database, then `webServer` boots the app against it with an
 * explicit env — Next only reads `.env` files from `apps/web` (there are none),
 * and `next` is invoked directly rather than through the dotenv-cli `dev`
 * script, so no dev credentials can leak in.
 *
 * Requires the local postgres container (`backflip-db`, port 5544) to be up.
 *
 * @spec L2-TEST-02, L2-TEST-05
 */
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: "**/screenshots.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    // Separate step (`test:e2e:screenshots`): captures PNGs into `.screenshots/`.
    {
      name: "screenshots",
      testMatch: "**/screenshots.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1200, height: 720 },
      },
    },
  ],
  webServer: {
    command: `../../node_modules/.bin/next dev -p ${PORT_APP}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      AUTH_SECRET: "e2e-auth-secret-do-not-use-in-production-0123456789",
      AUTH_TRUST_HOST: "true",
      ENCRYPTION_KEY: "e2e-encryption-key-do-not-use-in-production",
      // Own build dir so a dev server on 3070 and the e2e server never share `.next`.
      NEXT_DIST_DIR: ".next-e2e",
      // Credentials-only: no AUTH_GOOGLE_* on purpose.
      NODE_ENV: "development",
    },
  },
})
