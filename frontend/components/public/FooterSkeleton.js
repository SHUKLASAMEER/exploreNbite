import styles from "./Footer.module.css";

// Suspense fallback for Footer (see app/(site)/layout.js).
export default function FooterSkeleton() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.skeletonLine} aria-hidden="true" />
          <div className={styles.skeletonLineShort} aria-hidden="true" />
        </div>
      </div>
    </footer>
  );
}
