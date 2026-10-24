import { defineConfig } from "@playwright/test";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
process.env.E2E_DB ||= `report_desk_test_${Date.now()}`;
process.env.MONGODB_DB = process.env.E2E_DB;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 15000 },
  globalSetup: "./tests/e2e/setup.ts",
  globalTeardown: "./tests/e2e/teardown.ts",
  use: {
    baseURL: "http://localhost:3100",
    channel: "msedge",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      process.env.E2E_USE_BUILD === "1"
        ? "npm run start -- --port 3100"
        : "npm run dev -- --port 3100",
    url: "http://localhost:3100/en",
    reuseExistingServer: false,
    timeout: 180000,
    env: { MONGODB_DB: process.env.E2E_DB },
  },
});
