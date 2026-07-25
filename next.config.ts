import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static's binary isn't picked up by Next's dependency tracing automatically —
  // needed by the generation routes for chained-clip stitching (src/lib/ffmpeg.ts).
  outputFileTracingIncludes: {
    "/api/generations/**": ["./node_modules/ffmpeg-static/**"],
    "/api/v1/commercials/**": ["./node_modules/ffmpeg-static/**"],
  },
};

export default nextConfig;
