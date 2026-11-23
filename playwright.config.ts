import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: "http://localhost:4173" },
  webServer: {
    command: "node tests/e2e/serve.mjs",
    url: "http://localhost:4173/basic.html",
    reuseExistingServer: !process.env.CI,
  },
});
