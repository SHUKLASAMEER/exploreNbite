import styles from "./Header.module.css";

// Suspense fallback for Header (see app/(site)/layout.js) — shown for the
// brief window while Header's settings/menu fetch is in flight, so
// navigation never flashes empty.
export default function HeaderSkeleton() {
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <div className={styles.skeletonLogo} aria-hidden="true" />
        <div className={styles.skeletonNav} aria-hidden="true" />
      </div>
    </header>
  );
}
