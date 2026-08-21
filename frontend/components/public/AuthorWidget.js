import Link from "next/link";
import WidgetTitle from "./WidgetTitle";
import styles from "./Sidebar.module.css";

// "About the Author" sidebar card — the live site's global author widget
// (shown on every page, not just single posts). `author` comes from the
// public GET /api/authors list (backend/src/services/author.service.js).
export default function AuthorWidget({ author }) {
  if (!author) return null;

  return (
    <div className={styles.widget}>
      <WidgetTitle>About the Author</WidgetTitle>
      <div className={styles.authorCard}>
        {author.photoUrl ? (
          <img src={author.photoUrl} alt={author.name} className={styles.authorAvatar} />
        ) : (
          <span className={styles.authorInitial} aria-hidden="true">
            {author.name?.[0] ?? "?"}
          </span>
        )}
        <p className={styles.authorName}>{author.name}</p>
        {author.bio ? <p className={styles.authorBio}>{author.bio}</p> : null}
        <Link href={`/authors/${author.id}`} className={styles.authorLink}>
          View Profile
        </Link>
      </div>
    </div>
  );
}
