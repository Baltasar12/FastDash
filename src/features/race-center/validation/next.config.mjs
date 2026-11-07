import { fileURLToPath } from "node:url";

/** An isolated local fixture host, never imported by the application routes. */
const nextConfig = {
  poweredByHeader: false,
  distDir: "../../../../.next/race-center-preview",
  turbopack: { root: fileURLToPath(new URL("../../../../", import.meta.url)) },
};

export default nextConfig;
