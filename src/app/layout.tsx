import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getNavigation, getSiteInfo } from "@/lib/cms";
import { MENU_CODES, type NavItem } from "@/lib/content";
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

/**
 * Menü panelde açılmamışsa (yeni kurulumda normal) gezinme buradan gelir.
 * `delivery.menu()` bir sonuç döndürdüğü anda bu liste kullanılmaz.
 */
const defaultNav: NavItem[] = [
  { label: "Odalar", href: "/odalar", external: false, target: "_self", children: [] },
  { label: "Hizmetler", href: "/hizmetler", external: false, target: "_self", children: [] },
  { label: "İletişim", href: "/iletisim", external: false, target: "_self", children: [] },
];

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf7f1",
  colorScheme: "light",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [site, headerNav, footerNav] = await Promise.all([
    getSiteInfo(),
    getNavigation(MENU_CODES.header),
    getNavigation(MENU_CODES.footer),
  ]);

  return (
    <html lang="tr" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-paper text-ink">
        <SiteHeader
          siteName={site.name}
          phone={site.phone}
          nav={headerNav.length ? headerNav : defaultNav}
        />
        <main>{children}</main>
        <SiteFooter site={site} nav={footerNav} />
      </body>
    </html>
  );
}
