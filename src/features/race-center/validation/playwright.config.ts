import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../../../../", import.meta.url));

export default defineConfig({
  testDir: ".",
  testMatch: "race-center.spec.ts",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  reporter: "list",
  outputDir: fileURLToPath(
    new URL("../../../../test-results/race-center-preview", import.meta.url),
  ),
  use: {
    baseURL: "http://127.0.0.1:3101",
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "pnpm exec next start src/features/race-center/validation --hostname 127.0.0.1 --port 3101",
    cwd: repository,
    env: { SECTOR_RACE_CENTER_PREVIEW: "1" },
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
