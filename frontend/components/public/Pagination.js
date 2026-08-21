import Link from "next/link";
import styles from "./Pagination.module.css";

// `buildHref(page)` lets each caller (home, category, search) control the
// URL shape (e.g. "/?page=2" vs "/category/must-visit?page=2") without this
// component knowing about routes. Renders nothing for a single-page result
// set — no pagination controls needed when there's nothing to paginate.
export default function Pagination({ page, totalPages, buildHref }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className={styles.wrap} aria-label="Pagination">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={styles.link} aria-label="Previous page">
          Prev
        </Link>
      ) : null}

      {pages.map((p) =>
        p === page ? (
          <span key={p} className={styles.current} aria-current="page">
            {p}
          </span>
        ) : (
          <Link key={p} href={buildHref(p)} className={styles.link}>
            {p}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className={styles.link} aria-label="Next page">
          Next
        </Link>
      ) : null}
    </nav>
  );
}
