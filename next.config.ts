import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    // Transparent GET/POST proxy: OAuth state stays on the app origin.
    // A redirect to firebaseapp.com would reintroduce storage partitioning.
    return [{
      source: "/__/auth/:path*",
      destination: "https://quizpop-543-261121.firebaseapp.com/__/auth/:path*",
    }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/__/auth/:path*",
        headers: [
          // Firebase embeds its helper iframe on our own origin.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};
export default config;
