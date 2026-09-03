import Link from "next/link";
import Logo from "@/components/Logo";
import styles from "./Header.module.css";

// Suspense fallback for Header (see app/(site)/layout.js) — shown for the
// brief window while Header's settings/menu fetch is in flight, so
// navigation never flashes empty. Mirrors the real header's single-row
// shape (logo + nav placeholder) plus the hero (see HeaderClient.js) so the
// layout doesn't visibly shift once the real content swaps in. The logo
// itself needs no fetch (static local asset), so it renders for real here;
// only the parts that depend on the in-flight Settings/Menu fetch (nav
// links, social icons) are a blank bar.
export default function HeaderSkeleton() {
  return (
    <header className={styles.header}>
      <div className={styles.headerRow}>
        <Link href="/" className={styles.logoLink} aria-label="Explore N Bite">
          <Logo priority style={{ height: "var(--header-logo-height)", width: "auto" }} />
        </Link>
        <div className={styles.skeletonNav} aria-hidden="true" />
      </div>
      <div className={styles.skeletonHero}>
        <div className={styles.skeletonTitle} aria-hidden="true" />
      </div>
    </header>
  );
}
