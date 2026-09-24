import Link from "next/link";
import styles from "./PostNavigation.module.css";

// End-of-article previous / next links within the post's primary category
// (published posts only — see backend post.service.getAdjacentPublished).
// "Previous" is the older post, "Next" the newer one. A missing side is
// simply not rendered; with neither, nothing renders.
export default function PostNavigation({ previous, next }) {
  if (!previous && !next) return null;

  return (
    <nav aria-label="Post navigation" className={styles.nav}>
      {previous ? (
        <Link
          href={`/posts/${previous.slug}`}
          rel="prev"
          aria-label={`Previous post: ${previous.title}`}
          className={`${styles.link} ${styles.previous}`}
        >
          <span className={styles.label}>
            <span aria-hidden="true">← </span>Previous post
          </span>
          <span className={styles.title}>{previous.title}</span>
        </Link>
      ) : null}
      {next ? (
        <Link
          href={`/posts/${next.slug}`}
          rel="next"
          aria-label={`Next post: ${next.title}`}
          className={`${styles.link} ${styles.next}`}
        >
          <span className={styles.label}>
            Next post<span aria-hidden="true"> →</span>
          </span>
          <span className={styles.title}>{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}
