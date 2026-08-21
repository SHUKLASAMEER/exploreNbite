import styles from "./Header.module.css";

// Suspense fallback for Header (see app/(site)/layout.js) — shown for the
// brief window while Header's settings/menu fetch is in flight, so
// navigation never flashes empty. Mirrors the real header's centered
// brand-row + nav-bar tiers (see HeaderClient.js) so the layout doesn't
// visibly shift once the real content swaps in.
export default function HeaderSkeleton() {
  return (
    <header className={styles.header}>
      <div className={styles.brandRow}>
        <div className={styles.skeletonLogo} aria-hidden="true" />
      </div>
      <div className={styles.navBar}>
        <div className={styles.navBarInner}>
          <div className={styles.skeletonNav} aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
