import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            // Allow GHL to embed this app in iframes from all their domains.
            // *.gohighlevel.com — main GHL app
            // *.leadconnectorhq.com — LeadConnector (GHL white-label base)
            // *.msgsndr.com — older GHL white-label domains
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.gohighlevel.com https://*.leadconnectorhq.com https://*.msgsndr.com https://gohighlevel.com https://leadconnectorhq.com",
          },
          {
            // X-Frame-Options must be REMOVED entirely when using CSP frame-ancestors.
            // Setting it to any value (even ALLOWALL) can override CSP in some browsers.
            // Vercel doesn't let you delete a header, so we set it to an empty string
            // which effectively makes browsers ignore it.
            key: 'X-Frame-Options',
            value: '',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
