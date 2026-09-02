import { Geist, Geist_Mono } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";
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
// localhost. The default title/description below are the site-wide
// fallbacks for any route that doesn't set its own via generateMetadata;
// the old "rebuild in progress" placeholder is gone.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Offbeat travel stories and food, one bite at a time — by Sweta Papaiyawala.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
  },
  twitter: {
    card: "summary",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
