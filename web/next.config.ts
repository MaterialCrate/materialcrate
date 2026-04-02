import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "material-crate-storage.s3.eu-north-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
