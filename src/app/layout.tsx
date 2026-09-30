import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProvider } from "@/components/app-provider";
import { CompareBar, GlobalSearch, SiteFooter, SiteHeader } from "@/components/site-shell";
import { getPageCatalog, getPageDate } from "@/lib/server-catalog";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "AI Compare - Find your next AI advantage",
    template: "%s | AI Compare",
  },
  description: "Find the right AI for your next big idea. Explore and compare AI models by pricing, context, capabilities, and source-backed specifications.",
  applicationName: "AI Compare",
  openGraph: {
    type: "website",
    siteName: "AI Compare",
    title: "AI Compare - Less noise. Better AI choices.",
    description: "A little clarity in the world of AI. Discover, compare, and find your next AI model.",
  },
  twitter: { card: "summary_large_image" },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const catalog = await getPageCatalog();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <AppProvider catalog={catalog} referenceDate={getPageDate()}>
          <a href="#main-content" className="skip-link">Skip to content</a>
          <SiteHeader />
          <main id="main-content">{children}</main>
          <SiteFooter />
          <GlobalSearch />
          <CompareBar />
        </AppProvider>
      </body>
    </html>
  );
}
