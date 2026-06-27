import type { Metadata, Viewport } from "next";
// Self-hosted Geist fonts (no build-time Google Fonts fetch → reproducible builds).
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AnimatedBackground } from "@/components/animated-background";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ThemeProvider } from "@/components/theme-provider";
import { getSiteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "PopUp: Pop up. Sell out.",
    template: "%s · PopUp",
  },
  description:
    "Everything you need to run a timed pop-up shop, in one link.",
  applicationName: "PopUp",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PopUp",
  },
  openGraph: {
    title: "PopUp: Pop up. Sell out.",
    description:
      "Everything you need to run a timed pop-up shop, in one link.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#e6007a",
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
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col">
        <ThemeProvider>
          <AnimatedBackground />
          <ServiceWorkerRegister />
          <SiteHeader />
          <main className="relative flex-1">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
