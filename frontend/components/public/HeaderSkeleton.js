import Link from "next/link";
import Logo from "@/components/Logo";
import styles from "./Header.module.css";

// Suspense fallback for Header (see app/(site)/layout.js) — shown for the
// brief window while Header's settings/menu fetch is in flight, so
// navigation never flashes empty. Mirrors the real header's top-bar + hero +
// nav-bar shape (see HeaderClient.js) so the layout doesn't visibly shift
// once the real content swaps in. The logo itself needs no fetch (it's a
// static local asset, not CMS data), so it renders for real here instead of
// as a placeholder — only the parts that actually depend on the in-flight
// Settings/Menu fetch (social icons, nav links) are blank boxes.
export default function HeaderSkeleton() {
  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.logoLink} aria-label="Explore N Bite">
          <Logo priority style={{ height: "var(--header-logo-height)", width: "auto" }} />
        </Link>
      </div>
      <div className={styles.skeletonHero}>
        <div className={styles.skeletonTitle} aria-hidden="true" />
      </div>
      <div className={styles.skeletonNav}>
        <div className={styles.skeletonNavInner} aria-hidden="true" />
      </div>
    </header>
  );
}
