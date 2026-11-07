import { fileURLToPath } from "node:url";

/** Isolated local prototype host; never composed into application routes. */
const nextConfig = {
  poweredByHeader: false,
  distDir: "../../../../.next/telemetry-lab-preview",
  turbopack: { root: fileURLToPath(new URL("../../../../", import.meta.url)) },
};

export default nextConfig;
