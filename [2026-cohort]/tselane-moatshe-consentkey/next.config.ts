import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server build so the Docker image stays small
  // and runs with `node server.js` (no dev deps, no full node_modules copy).
  output: "standalone",
  // The existing integration layer under src/ imports sibling modules using
  // explicit ".js" specifiers (ESM/NodeNext style). Teach webpack to resolve
  // those to the real ".ts" sources so the app and the library share one tree.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ...config.resolve.extensionAlias,
    };
    return config;
  },
};

export default nextConfig;
