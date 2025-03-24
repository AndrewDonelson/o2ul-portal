// file: ./app/layout.tsx
// feature: WebApp Core

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Providers } from "@/providers/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const metadata: Metadata = {
  title: "Foch.Me WebApp",
  description: "A free and open platform for creating public and private chat communities. Built with :heart: by Nlaak Studios",
  other: {
    "google-adsense-account": "ca-pub-7431399643348196"
  },  
  icons: {
    icon: "/images/app/android-chrome-192x192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Client-side wrapper with providers
function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      {children}
    </Providers>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ClientProviders>
            {children}
          </ClientProviders>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}