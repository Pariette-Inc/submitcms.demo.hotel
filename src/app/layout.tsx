import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteInfo } from "@/lib/cms";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteInfo();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${site.name} — ${site.district} · Butik Otel`,
      template: `%s · ${site.name}`,
    },
    description: site.tagline,
    applicationName: site.name,
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: site.name,
      title: `${site.name} — Butik Otel`,
      description: site.tagline,
    },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf7f1",
  colorScheme: "light",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const site = await getSiteInfo();

  return (
    <html lang="tr" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-paper text-ink">
        <SiteHeader siteName={site.name} phone={site.phone} />
        <main>{children}</main>
        <SiteFooter site={site} />
      </body>
    </html>
  );
}
