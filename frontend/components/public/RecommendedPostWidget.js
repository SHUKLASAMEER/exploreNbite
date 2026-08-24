import Link from "next/link";
import WidgetTitle from "./WidgetTitle";
import styles from "./Sidebar.module.css";

// "Recommended Post" sidebar card (reference/exploreNbite UI/index.html's
// `.rec-post` widget: small avatar, author name, post title, muted
// excerpt). Backed by the most recent published post (see Sidebar.js) since
// there's no "featured/pinned post" flag on the Post model — a genuine
// content-modeling gap, not something worth a schema change for one sidebar
// widget.
export default function RecommendedPostWidget({ post }) {
  if (!post) return null;

  return (
    <div className={styles.widget}>
      <WidgetTitle>Recommended Post</WidgetTitle>
      <Link href={`/posts/${post.slug}`} className={styles.recPost}>
        {post.featuredImageUrl ? (
          <img src={post.featuredImageUrl} alt="" className={styles.recPostImage} />
        ) : (
          <span className={styles.recPostImagePlaceholder} aria-hidden="true" />
        )}
        {post.author ? <span className={styles.recPostAuthor}>{post.author.name}</span> : null}
        <span className={styles.recPostTitle}>{post.title}</span>
        {post.shortDescription ? <span className={styles.recPostExcerpt}>{post.shortDescription}</span> : null}
      </Link>
    </div>
  );
}
