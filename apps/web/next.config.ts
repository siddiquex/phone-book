import { existsSync } from "node:fs";
import type { NextConfig } from "next";

// Next only reads apps/web/.env, so load the repo-root one; real env vars still win.
if (existsSync("../../.env")) process.loadEnvFile("../../.env");

const apiUrl = process.env.API_URL ?? "http://localhost:5000";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Proxy the API so the browser stays same-origin and the API URL never ships to it
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
