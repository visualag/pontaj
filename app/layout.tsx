import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GHL Pontaj",
  description: "Internal time tracking for GHL Agency",
};

// Force all pages to be server-rendered (not static).
// This is required so that the middleware always runs on every request,
// guaranteeing that CSP frame-ancestors headers are fresh and never served
// from Vercel's Edge CDN cache (which would bypass the middleware).
export const dynamic = 'force-dynamic';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body className={`${inter.className} min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased`}>
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Se incarca...</div>}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
