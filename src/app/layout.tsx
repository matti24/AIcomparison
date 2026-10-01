import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProvider } from "@/components/app-provider";
import { CommandPalette } from "@/components/command-palette";
import { CompareTray } from "@/components/compare-tray";
import { CookieConsent, PageViewTracker } from "@/components/site-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPageCatalog, getPageDate, getPageSummaries, siteUrl } from "@/lib/server-catalog";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "AI Compare — Compare AI Models, Pricing & Benchmarks",
    template: "%s | AI Compare",
  },
  description: "Compare pricing, context windows, modalities, benchmarks, and API access across leading AI models and providers. Every fact links to its source.",
  applicationName: "AI Compare",
  openGraph: { type: "website", siteName: "AI Compare", locale: "en_US" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [catalog, summaries] = await Promise.all([getPageCatalog(), getPageSummaries()]);
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>
        <AppProvider models={summaries.models} providers={summaries.providers} referenceDate={getPageDate()} catalogUpdatedAt={catalog.updatedAt}>
          <a href="#main-content" className="skip-link">Skip to content</a>
          <SiteHeader />
          <main id="main-content">{children}</main>
          <SiteFooter modelCount={catalog.models.length} providerCount={catalog.providers.length} updatedAt={catalog.updatedAt} />
          <CommandPalette />
          <CompareTray />
          <CookieConsent />
          <PageViewTracker />
        </AppProvider>
      </body>
    </html>
  );
}
