import path from "node:path"
import type { NextConfig } from "next"

/** @spec L2-UI-10, L2-DEVOPS-16 */
const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) — run with `node server.js`,
  // not `next start`. Prod runtime: pm2 on the droplet, node in Docker locally.
  output: "standalone",
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
  transpilePackages: ["@workspace/ui"],
  devIndicators: {
    position: "bottom-right",
  },
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
  },
}

export default nextConfig
