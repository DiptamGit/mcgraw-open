import { defineConfig, devices } from "@playwright/test";

import {
  E2E_ORGANIZER_COOKIE_SECRET,
  E2E_ORGANIZER_PIN,
} from "./e2e/support/constants";
import { getLocalSupabaseEnvironment } from "./e2e/support/local-supabase";

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  globalSetup: "./e2e/support/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? ([["github"], ["list"], ["html", { open: "never" }]] as const)
    : [["list"] as const],
  use: {
    baseURL,
    trace: "retain-on-failure",
    // Vercel supplies this header in every deployed environment, and the
    // unlock rate limiter requires it. `next start` does not add it locally.
    extraHTTPHeaders: { "x-forwarded-for": "203.0.113.10" },
  },
  projects: [
    {
      name: "android-chrome",
      use: { ...devices["Pixel 7"] },
    },
    {
      // Playwright's WebKit instrumentation intermittently drops streamed
      // server-action responses, so iOS Safari covers the public pages, the
      // 320px layout, unlock, and the isolated network-failure recovery flow.
      // Full organizer writes are covered by the Chromium projects.
      name: "ios-safari",
      testIgnore:
        /organizer-(schedule|result|group-transitions|quarterfinal-assignment|knockout-progression)\.spec\.ts/,
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- --port " + port,
    url: baseURL,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 180_000,
    env: {
      ...getLocalSupabaseEnvironment(),
      ORGANIZER_PIN: E2E_ORGANIZER_PIN,
      ORGANIZER_COOKIE_SECRET: E2E_ORGANIZER_COOKIE_SECRET,
      NODE_ENV: "production",
      PORT: String(port),
    },
  },
});
