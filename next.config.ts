import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            // Allow embedding from ANY origin.
            // This app is an internal GHL tool — could run on any white-label domain.
            // Security comes from URL auth params (user_id), not CSP framing.
            key: 'Content-Security-Policy',
            value: "frame-ancestors *",
          },
          {
            // Set to empty string to neutralize — browsers ignore empty X-Frame-Options.
            // This ensures only CSP frame-ancestors controls iframe permissions.
            key: 'X-Frame-Options',
            value: '',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
