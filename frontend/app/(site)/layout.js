import { Suspense } from "react";
import { Playfair_Display, Open_Sans } from "next/font/google";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import HeaderSkeleton from "@/components/public/HeaderSkeleton";
import FooterSkeleton from "@/components/public/FooterSkeleton";
import styles from "./theme.module.css";

// Public-site layout — wraps every route under app/(site)/** (this route
// group adds no URL segment, so "/" still resolves here). Deliberately
// separate from /admin, which has no layout of its own and so falls back to
// the root app/layout.js only: admin pages never get this header/footer,
// this font loading, or these theme tokens.
//
// Playfair Display (headings) + Open Sans (body) are the live
// explorenbite.com site's actual theme fonts (see theme.module.css) — kept
// scoped to this layout via next/font/google's `variable` output rather
// than added to the root layout, so the admin bundle/rendering is
// unaffected.
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-open-sans",
});

// Header/Footer are async Server Components that fetch Settings + Menu
// (see lib/publicApi.js); each is wrapped in its own Suspense boundary
// (fallback: a matching skeleton) per Next.js's documented pattern for
// uncached layout-level data (node_modules/next/dist/docs/.../layout.md,
// "Interaction with loading.js") — loading.js itself can't show a fallback
// for a layout's own fetch, only a nested Suspense boundary can.
export default function PublicLayout({ children }) {
  return (
    <div className={`${playfairDisplay.variable} ${openSans.variable} ${styles.themeRoot}`}>
      {/* First focusable element: lets keyboard users jump past the header
          and navigation. tabIndex=-1 on <main> lets it take focus. */}
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <Suspense fallback={<FooterSkeleton />}>
        <Footer />
      </Suspense>
    </div>
  );
}
