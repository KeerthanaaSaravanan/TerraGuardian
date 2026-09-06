import { defineConfig } from "@playwright/test";

/**
 * TerraGuardian AI — Playwright E2E Configuration
 *
 * This is the harness configuration only.
 * Actual E2E tests will be added in later phases.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "operations-centre",
      use: {
        baseURL: "http://localhost:5173",
      },
    },
    {
      name: "terra-guardian-safe",
      use: {
        baseURL: "http://localhost:5174",
      },
    },
  ],
});
