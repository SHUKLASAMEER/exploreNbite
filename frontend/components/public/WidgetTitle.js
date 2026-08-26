import Link from "next/link";
import styles from "./WidgetTitle.module.css";

// `href` matches the live site's Facebook widget, whose title is itself a
// link out to the Facebook page (`.widget-title h2><a href="...">Recent
// posts</a></h2>`) — every other widget title on the live site is plain
// text, so this stays optional rather than every caller having to pass it.
export default function WidgetTitle({ children, background = "var(--enb-bg)", href }) {
  return (
    <div className={styles.wrap}>
      <h2 className={styles.text} style={{ background }}>
        {href ? (
          <Link href={href} target="_blank" rel="noreferrer noopener">
            {children}
          </Link>
        ) : (
          children
        )}
      </h2>
    </div>
  );
}
