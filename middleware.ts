import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Allow GHL to embed this app in iframes.
    // These domains cover all GHL deployments:
    // - app.gohighlevel.com (main GHL)
    // - app.leadconnectorhq.com (LeadConnector / GHL base)
    // - *.msgsndr.com (white-label GHL agencies)
    response.headers.set(
        'Content-Security-Policy',
        "frame-ancestors 'self' https://*.gohighlevel.com https://*.leadconnectorhq.com https://*.msgsndr.com https://gohighlevel.com https://leadconnectorhq.com"
    );

    // Delete X-Frame-Options entirely — it conflicts with CSP frame-ancestors.
    // When both are present, behaviour is browser-specific and often broken.
    response.headers.delete('X-Frame-Options');

    return response;
}

// Run on ALL routes including static pages and API routes
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
