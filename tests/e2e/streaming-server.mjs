// A fresh process per streaming test isolates provider caches, budgets and
// cooldowns from the parallel suite and from previous attempts/repetitions.
import "./mock-jolpica.mjs";
import { createServer } from "node:http";
import next from "next";

if (process.env.SECTOR_E2E_STREAMING !== "1" || !process.send) {
  throw new Error(
    "Streaming server requires the isolated Playwright IPC child",
  );
}
// Register before preparation so a worker lost during startup cannot orphan us.
process.on("disconnect", () => process.exit(0));
if (!process.connected) process.exit(0);

const app = next({ dev: false, hostname: "127.0.0.1" });
await app.prepare();
const server = createServer(app.getRequestHandler());
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing port");
  process.send({ ready: `http://127.0.0.1:${address.port}` });
});
