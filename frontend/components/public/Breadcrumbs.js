import Link from "next/link";
import styles from "./Breadcrumbs.module.css";

// Visible breadcrumb trail. Pages pass the SAME `crumbs` array they give to
// buildBreadcrumbJsonLd (lib/seo.js), so the UI and the BreadcrumbList
// JSON-LD always show one hierarchy. Same rules as that builder: entries
// need a name and a path, and a trail shorter than 2 renders nothing. The
// last crumb is the current page: plain text with aria-current, not a link.
export default function Breadcrumbs({ crumbs = [] }) {
  const items = (crumbs || []).filter((c) => c && c.name && c.path);
  if (items.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className={styles.nav}>
      <ol className={styles.list}>
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={crumb.path} className={styles.item}>
              {index > 0 ? (
                <span className={styles.separator} aria-hidden="true">
                  ›
                </span>
              ) : null}
              {isLast ? (
                <span aria-current="page" className={styles.current}>
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.path} className={styles.link}>
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
