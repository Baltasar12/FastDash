import { fork } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { expect, test as base } from "@playwright/test";

type StreamingServer = {
  url: string;
  calendarBlocked: Promise<void>;
  release: () => void;
};

const test = base.extend<{ streamingServer: StreamingServer }>({
  streamingServer: async ({}, provideServer) => {
    const child = fork(
      fileURLToPath(new URL("./streaming-server.mjs", import.meta.url)),
      {
        env: {
          ...process.env,
          NODE_OPTIONS: "",
          SECTOR_E2E: "1",
          SECTOR_E2E_STREAMING: "1",
        },
        stdio: ["ignore", "pipe", "pipe", "ipc"],
      },
    );
    let logs = "";
    child.stdout?.on("data", (data: Buffer) => {
      logs += data.toString();
    });
    child.stderr?.on("data", (data: Buffer) => {
      logs += data.toString();
    });
    let blocked: () => void = () => {};
    const calendarBlocked = new Promise<void>((resolve) => {
      blocked = resolve;
    });
    const ready = new Promise<string>((resolve, reject) => {
      child.on("message", (message: unknown) => {
        if (message === "calendar-blocked") blocked();
        if (
          typeof message === "object" &&
          message !== null &&
          "ready" in message &&
          typeof message.ready === "string"
        )
          resolve(message.ready);
      });
      child.once("error", reject);
      child.once("exit", (code) =>
        reject(new Error(`Streaming server exited (${code}): ${logs}`)),
      );
    });
    let startupTimer: ReturnType<typeof setTimeout> | undefined;
    const startupTimeout = new Promise<never>((_, reject) => {
      startupTimer = setTimeout(
        () => reject(new Error(`Streaming server did not start: ${logs}`)),
        15000,
      );
    });
    try {
      const url = await Promise.race([ready, startupTimeout]);
      clearTimeout(startupTimer);
      await provideServer({
        url,
        calendarBlocked,
        release: () => {
          child.send("release-calendar");
        },
      });
    } finally {
      clearTimeout(startupTimer);
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        child.kill();
        await exited;
      }
    }
  },
});

test("the streaming dashboard exposes loading before provider availability resolves", async ({
  page,
  streamingServer,
}) => {
  // commit starts reading the streamed document without waiting for completion.
  // A unique server makes this a cold provider request on both browser projects.
  await page.goto(`${streamingServer.url}/overview?season=2024`, {
    waitUntil: "commit",
  });
  await streamingServer.calendarBlocked;
  const loading = page
    .getByRole("status")
    .filter({ hasText: "Loading the season overview" });
  await expect(loading).toBeVisible();
  await expect(page.getByText("Data unavailable")).toHaveCount(0);
  streamingServer.release();
  await expect(loading).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Season");
  await expect(page.getByText("Data unavailable").first()).toBeVisible();
  await expect(page.getByText("Jolpica could not be reached.")).toHaveCount(0);
});
