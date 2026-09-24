import type { Metadata, Viewport } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { WatchedProvider } from "@/components/providers/WatchedProvider";
import { JsonLd, SITE_URL, absoluteUrl } from "@/components/seo/JsonLd";
import { getCurrentUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HomeAtlas — GTA Real Estate Intelligence",
    template: "%s · HomeAtlas",
  },
  description:
    "Search active MLS® listings across the Greater Toronto Area, track market trends, and get an instant home valuation.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    siteName: "HomeAtlas",
    type: "website",
    locale: "en_CA",
  },
};

/*
 * Site-wide structured data: who publishes the site, and a sitelinks search
 * box pointed at the listings search (`q` is what /listings reads).
 */
const SITE_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${SITE_URL}/#organization`,
    name: "HomeAtlas",
    url: absoluteUrl("/"),
    areaServed: { "@type": "Place", name: "Greater Toronto Area, Ontario, Canada" },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "HomeAtlas",
    url: absoluteUrl("/"),
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-CA",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/listings?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  },
];

export const viewport: Viewport = {
  themeColor: "#1b2e4b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Resolved server-side so the first paint already reflects the session.
  const user = await getCurrentUser();

  return (
    <html lang="en-CA" className={cn("h-full", inter.variable, "font-sans", geist.variable)}>
      <body className="flex min-h-full flex-col bg-surface font-sans text-ink">
        <JsonLd data={SITE_JSON_LD} />
        <a
          href="#main"
          className="sr-only rounded-control bg-navy px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[300]"
        >
          Skip to main content
        </a>
        <QueryProvider>
          <AuthProvider initialUser={user}>
            <WatchedProvider>{children}</WatchedProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
