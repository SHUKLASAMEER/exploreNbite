import Link from "next/link";
import WidgetTitle from "./WidgetTitle";
import styles from "./Sidebar.module.css";

// Sidebar badge tiles (reference/exploreNbite UI: `.badges`/`.badge` —
// "TRIPOTO APPROVED BLOGGER" etc. on the live site). Those specific badges
// are static images from the old WordPress theme with no CMS equivalent;
// backed here by the real Award model instead (same data as /awards),
// showing up to the 3 most recent awards as badge tiles.
export default function BadgesWidget({ awards }) {
  if (!awards || awards.length === 0) return null;

  return (
    <div className={styles.widget}>
      <WidgetTitle>Recognition</WidgetTitle>
      <div className={styles.badges}>
        {awards.map((award) => (
          <Link key={award.id} href="/awards" className={styles.badge}>
            {award.imageUrl ? <img src={award.imageUrl} alt="" className={styles.badgeImage} /> : null}
            <span>{award.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
