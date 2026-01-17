import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Only use static export for production builds
  ...(isDev ? {} : { output: "export" }),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Turbopack config to handle sql.js Node.js polyfills
  turbopack: {
    resolveAlias: {
      fs: { browser: "./src/lib/empty-module.js" },
      path: { browser: "./src/lib/empty-module.js" },
      crypto: { browser: "./src/lib/empty-module.js" },
    },
  },
  // Server external packages for sql.js
  serverExternalPackages: ["sql.js"],
};

export default nextConfig;
