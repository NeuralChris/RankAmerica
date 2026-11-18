import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server in .next/standalone for the Docker image.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "geolocation=(),camera=(),microphone=()" }
      ]
    }];
  }
};

export default nextConfig;
