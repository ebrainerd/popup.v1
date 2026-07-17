import type { Metadata, Viewport } from "next";
// Self-hosted Geist fonts (no build-time Google Fonts fetch → reproducible builds).
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { syne } from "@/lib/fonts";
import "./globals.css";
import { AnimatedBackground } from "@/components/animated-background";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { DeployRefreshGuard } from "@/components/deploy-refresh-guard";
import { ThemeProvider } from "@/components/theme-provider";
import { getSiteUrl } from "@/lib/env";
import {
  BRAND_TAGLINE,
  BRAND_TAGLINE_PAIRING,
  BRAND_TITLE_DEFAULT,
} from "@/lib/brand-copy";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: BRAND_TITLE_DEFAULT,
    template: "%s · PopUp",
  },
  description: `${BRAND_TAGLINE} ${BRAND_TAGLINE_PAIRING}`,
  applicationName: "PopUp",
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PopUp",
  },
  openGraph: {
    title: BRAND_TITLE_DEFAULT,
    description: `${BRAND_TAGLINE} ${BRAND_TAGLINE_PAIRING}`,
    type: "website",
    // ?v= busts scraper caches (FB/X/iMessage cache by exact URL) when the
    // artwork changes. Bump it whenever og.jpg is replaced.
    images: [
      {
        url: "/og.jpg?v=4",
        width: 1200,
        height: 630,
        alt: `PopUp — ${BRAND_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_TITLE_DEFAULT,
    description: `${BRAND_TAGLINE} ${BRAND_TAGLINE_PAIRING}`,
    images: ["/og.jpg?v=4"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ff5c1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col">
        <ThemeProvider>
          <AnimatedBackground />
          <DeployRefreshGuard />
          <ServiceWorkerRegister />
          <SiteHeader />
          <main className="relative flex-1">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
