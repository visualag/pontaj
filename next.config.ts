import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            // Allow GHL to embed this app in iframes from all their domains:
            // app.gohighlevel.com, app.leadconnectorhq.com, white-label *.msgsndr.com
            key: 'Content-Security-Policy',
            value: [
              "frame-ancestors",
              "'self'",
              "https://*.gohighlevel.com",
              "https://*.leadconnectorhq.com",
              "https://*.msgsndr.com",
              "https://gohighlevel.com",
              "https://leadconnectorhq.com",
            ].join(' '),
          },
          {
            // Remove X-Frame-Options entirely — CSP frame-ancestors takes precedence
            // but some older browsers check this too
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
