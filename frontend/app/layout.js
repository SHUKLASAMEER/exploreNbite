import { Geist, Geist_Mono } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { getSeoDefaults } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// metadataBase makes every relative canonical/OG URL resolve against the
// real public origin (NEXT_PUBLIC_SITE_URL), never the request host or
// localhost. The site name, default description and default OG image are
// admin-managed (Settings.siteTitle / metaDescription / defaultOgImageUrl)
// and read here via getSeoDefaults(); SITE_NAME is only the hard fallback.
export async function generateMetadata() {
  const { siteName, description, ogImage } = await getSeoDefaults();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    applicationName: siteName,
    openGraph: {
      type: "website",
      siteName,
      url: SITE_URL,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
