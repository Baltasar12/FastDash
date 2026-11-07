import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../../../../", import.meta.url));

export default defineConfig({
  testDir: ".",
  testMatch: "telemetry-lab.spec.ts",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  reporter: "list",
  outputDir: fileURLToPath(
    new URL("../../../../test-results/telemetry-lab-preview", import.meta.url),
  ),
  use: {
    baseURL: "http://127.0.0.1:3102",
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "pnpm exec next start src/features/telemetry-lab/validation --hostname 127.0.0.1 --port 3102",
    cwd: repository,
    env: { SECTOR_TELEMETRY_PREVIEW: "1" },
    url: "http://127.0.0.1:3102",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
