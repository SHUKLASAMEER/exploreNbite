import Link from "next/link";
import Button from "./Button";
import { formatDate } from "@/lib/formatDate";
import styles from "./PostCard.module.css";

// One post as it appears in a listing (Home, category archive, search
// results, author archive) — all four pages share this exact card. Fields
// come straight off a public GET /api/posts list item (see
// backend/src/services/post.service.js#toPublicPost) — no content field on
// this list shape, so this only ever renders the excerpt
// (shortDescription), never the full post body.
export default function PostCard({ post }) {
  const postHref = `/posts/${post.slug}`;

  return (
    <article className={styles.card}>
      {post.featuredImageUrl ? (
        <Link href={postHref} className={styles.media}>
          {/* Plain <img>, not next/image: featuredImageUrl is an absolute
              URL already served by the backend (see
              backend/src/services/media.service.js#toPublicUrl); next/image
              would need next.config.js remotePatterns for that host, and
              this project's existing convention (Logo.js) is next/image
              only for the one locally-bundled asset. */}
          <img src={post.featuredImageUrl} alt={post.title} loading="lazy" />
        </Link>
      ) : null}

      <header className={styles.header}>
        {/* `categories` is the full set (primary + any extra WordPress-style
            categories a post also belongs to, see backend/src/services/post.service.js#toPublicPost)
            — falls back to the single `category` for any caller that hasn't
            been updated to request the new field. Joined inline with ",  "
            (comma + two nbsp) exactly like the live site's `.post-categories`
            markup, rather than one per line. */}
        {(post.categories ?? (post.category ? [post.category] : [])).length > 0 ? (
          <div className={styles.category}>
            {(post.categories ?? [post.category]).map((category, i) => (
              <span key={category.id}>
                {i > 0 ? <span aria-hidden="true">,{"  "}</span> : null}
                <Link href={`/category/${category.slug}`}>{category.name}</Link>
              </span>
            ))}
          </div>
        ) : null}

        <h2 className={styles.title}>
          <Link href={postHref}>{post.title}</Link>
        </h2>

        <div className={styles.meta}>{formatDate(post.publishDate)}</div>
      </header>

      {post.shortDescription ? <p className={styles.excerpt}>{post.shortDescription}</p> : null}

      <div className={styles.readMore}>
        <Button href={postHref} variant="outline">
          Read More
        </Button>
      </div>

      {post.author ? (
        <>
          <hr className={styles.divider} />
          <footer className={styles.footer}>
            <Link href={`/authors/${post.author.id}`} className={styles.author}>
              {post.author.photoUrl ? (
                <img className={styles.authorAvatar} src={post.author.photoUrl} alt="" aria-hidden="true" />
              ) : (
                <span className={styles.authorInitial} aria-hidden="true">
                  {post.author.name?.[0] ?? "?"}
                </span>
              )}
              {post.author.name}
            </Link>
          </footer>
        </>
      ) : null}
    </article>
  );
}
