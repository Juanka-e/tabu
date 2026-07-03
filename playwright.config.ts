import { defineConfig } from "@playwright/test";

const baseURL = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3201";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL,
    headless: true,
  },
  reporter: "list",
  webServer: process.env.SMOKE_BASE_URL
    ? undefined
    : {
        command:
          "npx.cmd tsx scripts/start-playwright-smoke-server.ts",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        gracefulShutdown: {
          signal: "SIGINT",
          timeout: 5_000,
        },
      },
});
