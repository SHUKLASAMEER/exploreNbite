import { Suspense } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import HeaderSkeleton from "@/components/public/HeaderSkeleton";
import FooterSkeleton from "@/components/public/FooterSkeleton";

// Public-site layout — wraps every route under app/(site)/** (this route
// group adds no URL segment, so "/" still resolves here). Deliberately
// separate from /admin, which has no layout of its own and so falls back to
// the root app/layout.js only: admin pages never get this header/footer,
// and this layout never runs requireAdminOrRedirect.
//
// Header/Footer are async Server Components that fetch Settings + Menu
// (see lib/publicApi.js); each is wrapped in its own Suspense boundary
// (fallback: a matching skeleton) per Next.js's documented pattern for
// uncached layout-level data (node_modules/next/dist/docs/.../layout.md,
// "Interaction with loading.js") — loading.js itself can't show a fallback
// for a layout's own fetch, only a nested Suspense boundary can.
export default function PublicLayout({ children }) {
  return (
    <>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main style={{ flex: 1 }}>{children}</main>
      <Suspense fallback={<FooterSkeleton />}>
        <Footer />
      </Suspense>
    </>
  );
}
