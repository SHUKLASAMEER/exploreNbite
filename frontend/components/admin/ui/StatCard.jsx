import Link from "next/link";
import styles from "./StatCard.module.css";

// value: number | "—" (use "—" for a metric that failed to load — never a
// fabricated number). href is optional; when present the whole card links
// to the module that owns this metric.
export default function StatCard({ icon: Icon, label, value, href }) {
  const content = (
    <>
      <div className={styles.iconWrap}>{Icon ? <Icon size={20} strokeWidth={2} aria-hidden="true" /> : null}</div>
      <div className={styles.body}>
        <div className={styles.value}>{value}</div>
        <div className={styles.label}>{label}</div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${styles.card} ${styles.linkable}`}>
        {content}
      </Link>
    );
  }

  return <div className={styles.card}>{content}</div>;
}
