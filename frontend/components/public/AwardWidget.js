import Link from "next/link";
import WidgetTitle from "./WidgetTitle";
import styles from "./Sidebar.module.css";

// Sidebar highlight for the most recent Award — mirrors the live site's
// "Awarded best travel and food writer of Gujarat" image widget, but backed
// by the real Award CMS model instead of a static image. `award` is the
// first item from the public GET /api/awards list (already newest-first).
export default function AwardWidget({ award }) {
  if (!award) return null;

  return (
    <div className={styles.widget}>
      <WidgetTitle>Recognition</WidgetTitle>
      <div className={styles.awardCard}>
        {award.imageUrl ? <img src={award.imageUrl} alt={award.title} className={styles.awardImage} /> : null}
        <p className={styles.awardTitle}>{award.title}</p>
        <Link href="/awards" className={styles.awardLink}>
          See All Awards
        </Link>
      </div>
    </div>
  );
}
