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
        {post.category ? (
          <Link href={`/category/${post.category.slug}`} className={styles.category}>
            {post.category.name}
          </Link>
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
              <span className={styles.authorInitial} aria-hidden="true">
                {post.author.name?.[0] ?? "?"}
              </span>
              {post.author.name}
            </Link>
          </footer>
        </>
      ) : null}
    </article>
  );
}
