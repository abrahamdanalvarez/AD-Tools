import { defineConfig, devices } from "@playwright/test";

// E2E runs against the production build served as plain static files,
// the same way Apache serves public_html. Run `npm run build` first.
// Tool behaviour runs in all three engines; layout, accessibility and routing
// checks run in Chromium.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://127.0.0.1:4173" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testMatch: /image-converter\.spec\.ts/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testMatch: /image-converter\.spec\.ts/ },
  ],
  webServer: {
    command: "node scripts/serve-dist.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
