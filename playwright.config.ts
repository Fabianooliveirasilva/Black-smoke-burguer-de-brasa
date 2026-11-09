import { defineConfig, devices } from "@playwright/test";
import { testEnv } from "./tests/support/test-env";

const dev = process.env.E2E_DEV === "1";

export default defineConfig({
  testDir: "tests",
  testMatch: ["api/**/*.spec.ts", "e2e/**/*.spec.ts"],
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled" } },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/support/pw-global-setup.ts",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure", screenshot: "only-on-failure", locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [
    { name: "api", testMatch: "api/**/*.spec.ts" },
    { name: "e2e-desktop", testMatch: "e2e/**/*.spec.ts", testIgnore: "e2e/mobile.spec.ts", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 } } },
    { name: "e2e-mobile", testMatch: "e2e/mobile.spec.ts", use: { ...devices["Pixel 7"] } },
    // Cross-browser: the functional journeys on Firefox and WebKit (Safari's engine). Visual baselines,
    // axe and the viewport matrix stay on Chromium — they test the page, not the engine.
    ...(["firefox", "webkit"] as const).map((b) => ({
      name: `e2e-${b}`,
      testMatch: ["e2e/customer-journey.spec.ts", "e2e/exploratory.spec.ts", "e2e/access.spec.ts", "e2e/account.spec.ts", "e2e/pix.spec.ts", "e2e/hydration.spec.ts"],
      use: { ...devices[b === "firefox" ? "Desktop Firefox" : "Desktop Safari"], viewport: { width: 1366, height: 860 } },
    })),
    { name: "e2e-mobile-safari", testMatch: "e2e/mobile.spec.ts", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: dev ? "pnpm exec next dev -p 3100" : "node .next/standalone/server.js",
    url: "http://localhost:3100/api/menu",
    reuseExistingServer: process.env.PW_REUSE === "1",
    timeout: 180_000,
    env: {
      ...testEnv,
      MP_ACCESS_TOKEN: "TEST-e2e-fake-token",
      MP_WEBHOOK_SECRET: "whsec_e2e",
      MP_API_BASE_URL: "http://localhost:3199",
      PORT: "3100",
      HOSTNAME: "localhost",
    },
  },
});
