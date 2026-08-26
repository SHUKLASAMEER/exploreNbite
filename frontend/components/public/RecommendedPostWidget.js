import Link from "next/link";
import WidgetTitle from "./WidgetTitle";
import styles from "./Sidebar.module.css";

// "Recommended post" sidebar widget — matches the live site's actual
// `.widget_authors` widget exactly (verified against the live HTML, not the
// old assumption that this was a single "featured post" card): the site
// author's avatar + name, then a short list of their most recent posts
// (2 on the live site) as plain title links — no excerpt, no per-post
// image.
export default function RecommendedPostWidget({ author, posts }) {
  if (!author || !posts || posts.length === 0) return null;

  return (
    <div className={styles.widget}>
      <WidgetTitle>Recommended post</WidgetTitle>
      <div className={styles.recAuthor}>
        <Link href={`/authors/${author.id}`} className={styles.recAuthorLink}>
          {author.photoUrl ? (
            <img src={author.photoUrl} alt="" className={styles.recAuthorAvatar} />
          ) : (
            <span className={styles.recAuthorInitial} aria-hidden="true">
              {author.name?.[0] ?? "?"}
            </span>
          )}
          <strong>{author.name}</strong>
        </Link>
        <ul className={styles.recPostList}>
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/posts/${post.slug}`} title={post.title}>
                {post.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
