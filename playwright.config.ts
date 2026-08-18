import { defineConfig, devices } from "@playwright/test";

const testPort = process.env.PLAYWRIGHT_TEST_PORT ?? "3000";

if (!/^\d+$/u.test(testPort)) {
  throw new Error("PLAYWRIGHT_TEST_PORT must contain only digits");
}

const baseUrl = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Each mock checkout receives a distinct reference, so scenario changes are
  // isolated even when browser journeys or a candidate review run concurrently.
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: baseUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Mock scenario controls are intentionally development-only. Production
    // compilation remains a separate required `pnpm build` gate.
    command: `pnpm dev --port ${testPort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseUrl,
  },
});
