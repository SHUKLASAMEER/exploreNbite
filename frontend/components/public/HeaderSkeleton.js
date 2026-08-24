import styles from "./Header.module.css";

// Suspense fallback for Header (see app/(site)/layout.js) — shown for the
// brief window while Header's settings/menu fetch is in flight, so
// navigation never flashes empty. Mirrors the real header's hero + nav-bar
// shape (see HeaderClient.js) so the layout doesn't visibly shift once the
// real content swaps in.
export default function HeaderSkeleton() {
  return (
    <header className={styles.header}>
      <div className={styles.skeletonHero}>
        <div className={styles.skeletonTitle} aria-hidden="true" />
      </div>
      <div className={styles.skeletonNav}>
        <div className={styles.skeletonNavInner} aria-hidden="true" />
      </div>
    </header>
  );
}
