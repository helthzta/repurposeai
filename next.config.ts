import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static resolves its binary path via `path.join(__dirname, ...)` — if webpack
  // bundles the package, __dirname resolves to the .next bundle dir instead of the real
  // node_modules/ffmpeg-static folder, and the binary is never found (ENOENT). Excluding it
  // from bundling keeps __dirname correct; outputFileTracingIncludes below then makes sure
  // the actual binary file ships in a production standalone build.
  serverExternalPackages: ["ffmpeg-static"],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingIncludes: {
    "/api/generations/**": ["./node_modules/ffmpeg-static/**"],
    "/api/v1/commercials/**": ["./node_modules/ffmpeg-static/**"],
  },
};

export default nextConfig;
