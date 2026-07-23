import path from "node:path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  devIndicators: {
    position: "bottom-right",
  },
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
  },
}

export default nextConfig
