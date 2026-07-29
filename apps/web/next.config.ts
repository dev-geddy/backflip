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
  experimental: {
    // Persistent Turbopack cache in .next/cache — the droplet keeps .next
    // between deploys (rsync-protected), so warm rebuilds skip most compilation.
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
  },
  typescript: {
    // Droplet builds run on 1 vCPU; the type check adds ~60s there and the same
    // code is typechecked in dev/CI. Deploy scripts set NEXT_SKIP_TYPECHECK=1;
    // local/CI builds still check.
    ignoreBuildErrors: process.env.NEXT_SKIP_TYPECHECK === "1",
  },
}

export default nextConfig
