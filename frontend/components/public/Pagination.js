import Link from "next/link";
import styles from "./Pagination.module.css";

// `buildHref(page)` lets each caller (home, category, search) control the
// URL shape (e.g. "/?page=2" vs "/category/must-visit?page=2") without this
// component knowing about routes. Renders nothing for a single-page result
// set — no pagination controls needed when there's nothing to paginate.
//
// Matches the live site's `.blog-pagination.default` exactly — a plain
// "← Older Posts" / "Newer Posts →" pair (previous-page floated left,
// next-page floated right), not numbered page links; the live theme never
// renders numbered pagination on the blog/category archives, only this.
export default function Pagination({ page, totalPages, buildHref }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  return (
    <nav className={styles.wrap} aria-label="Pagination">
      {page < totalPages ? (
        <div className={styles.previous}>
          <Link href={buildHref(page + 1)}>
            <span aria-hidden="true">←</span> Older Posts
          </Link>
        </div>
      ) : null}
      {page > 1 ? (
        <div className={styles.next}>
          <Link href={buildHref(page - 1)}>
            Newer Posts <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
