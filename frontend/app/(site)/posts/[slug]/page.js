import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import ProseContent from "@/components/public/ProseContent";
import CommentList from "@/components/public/CommentList";
import CommentForm from "@/components/public/CommentForm";
import StateMessage from "@/components/public/StateMessage";
import { getPublicPostBySlug, getPublicComments, getPublicPosts } from "@/lib/publicApi";
import { buildMetadata, buildBlogPostingJsonLd, buildBreadcrumbJsonLd, getSeoDefaults } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import { formatDate } from "@/lib/formatDate";
import styles from "@/components/public/SinglePost.module.css";
import commentStyles from "@/components/public/Comments.module.css";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { post } = await getPublicPostBySlug(slug);
  if (!post) return {};
  const { siteName, description, ogImage } = await getSeoDefaults();
  return buildMetadata({
    path: `/posts/${post.slug}`,
    title: post.title,
    description: post.shortDescription ?? description,
    image: post.featuredImageUrl ?? undefined,
    defaultImage: ogImage,
    siteName,
    type: "article",
    publishedTime: post.publishDate ?? undefined,
    modifiedTime: post.updatedAt ?? post.publishDate ?? undefined,
    authors: post.author?.name ? [post.author.name] : undefined,
  });
}

// Absolute post URL for the share-row links below — Twitter/Facebook/
// LinkedIn's share intents require a fully-qualified URL, and there's no
// NEXT_PUBLIC_SITE_URL env var in this project to build one from, so it's
// derived from the incoming request's own Host header instead (same
// pattern serverApiFetch uses for the Cookie header).
async function getAbsolutePostUrl(slug) {
  const headerList = await headers();
  const host = headerList.get("host");
  if (!host) return `/posts/${slug}`;
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}/posts/${slug}`;
}

export default async function SinglePostPage({ params }) {
  const { slug } = await params;
  const { post, error, notFound: postNotFound } = await getPublicPostBySlug(slug);

  if (postNotFound) {
    notFound();
  }

  if (error || !post) {
    return (
      <TwoColumnLayout sidebar={<Sidebar layout="post" />}>
        <StateMessage kind="error" title="Couldn't load this post.">
          {error}
        </StateMessage>
      </TwoColumnLayout>
    );
  }

  const [{ comments, error: commentsError }, postUrl, relatedPosts, seo] = await Promise.all([
    getPublicComments(post.id),
    getAbsolutePostUrl(post.slug),
    getRelatedPosts(post),
    getSeoDefaults(),
  ]);

  // Structured data — BlogPosting (this is a blog) + a Home -> Category ->
  // Post breadcrumb. Only reached for a genuinely published post (backend
  // getBySlug forces status === "published"); a draft 404s above.
  const articleJsonLd = buildBlogPostingJsonLd({ post, siteName: seo.siteName, logoUrl: seo.logoUrl });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    post.category ? { name: post.category.name, path: `/category/${post.category.slug}` } : null,
    { name: post.title, path: `/posts/${post.slug}` },
  ].filter(Boolean));

  const shareLinks = [
    { name: "Twitter", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}` },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}` },
  ];

  return (
    <TwoColumnLayout sidebar={<Sidebar layout="post" excludePostId={post.id} />}>
      <JsonLd data={[articleJsonLd, breadcrumbJsonLd]} />
      <article>
        {post.featuredImageUrl ? (
          <div className={styles.media}>
            <img src={post.featuredImageUrl} alt={post.title} />
          </div>
        ) : null}

        <header className={styles.header}>
          {post.category ? (
            <Link href={`/category/${post.category.slug}`} className={styles.category}>
              {post.category.name}
            </Link>
          ) : null}
          <h1 className={styles.title}>{post.title}</h1>
          <div className={styles.meta}>
            {formatDate(post.publishDate)}
            {post.author ? (
              <>
                <span className={styles.metaSep}>/</span>
                <Link href={`/authors/${post.author.id}`}>By {post.author.name}</Link>
              </>
            ) : null}
          </div>
        </header>

        <ProseContent html={post.content} />

        <div className={styles.shareRow}>
          <span className={styles.shareLabel}>Share this post:</span>
          {shareLinks.map((link, index) => (
            <span key={link.name}>
              {index > 0 ? " · " : null}
              <a href={link.href} target="_blank" rel="noopener noreferrer">
                on {link.name}
              </a>
            </span>
          ))}
        </div>

        {relatedPosts.length > 0 ? (
          <div className={styles.relatedPosts}>
            {relatedPosts.map((related) => (
              <Link key={related.id} href={`/posts/${related.slug}`} className={styles.relatedCard}>
                {related.featuredImageUrl ? (
                  <span className={styles.relatedMedia}>
                    <img src={related.featuredImageUrl} alt="" />
                  </span>
                ) : null}
                <div className={styles.relatedTitle}>{related.title}</div>
                <div className={styles.relatedDate}>
                  {formatDate(related.publishDate)}
                  {related.category ? ` · In "${related.category.name}"` : ""}
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {post.tags && post.tags.length > 0 ? (
          <div className={styles.tags}>
            {post.tags.map((tag) => (
              <span key={tag.id} className={styles.tag}>
                {tag.name}
              </span>
            ))}
          </div>
        ) : null}

        {post.author ? (
          <>
            <hr className={styles.divider} />
            <div className={styles.postAuthorRow}>
              <Link href={`/authors/${post.author.id}`} className={styles.postAuthor}>
                <span className={styles.postAuthorInitial} aria-hidden="true">
                  {post.author.name?.[0] ?? "?"}
                </span>
                By {post.author.name}
              </Link>
              {comments && comments.length > 0 ? (
                <span className={styles.postComments}>
                  {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
                </span>
              ) : null}
            </div>
          </>
        ) : null}

        <section className={commentStyles.section}>
          <h2 className={commentStyles.heading}>
            {comments && comments.length > 0 ? `${comments.length} Comments` : "Comments"}
          </h2>

          {commentsError ? (
            <StateMessage kind="error" title="Couldn't load comments.">
              {commentsError}
            </StateMessage>
          ) : (
            <CommentList comments={comments} />
          )}

          {post.allowComments ? (
            <CommentForm postId={post.id} />
          ) : (
            <p className={commentStyles.disabledNotice}>Comments are closed for this post.</p>
          )}
        </section>
      </article>
    </TwoColumnLayout>
  );
}

// Related posts (reference/exploreNbite UI/post.html's `.related-posts`) —
// the newest other posts in the same category, since there's no dedicated
// "related posts" relation on the Post model.
async function getRelatedPosts(post) {
  if (!post.category) return [];
  const { posts } = await getPublicPosts({ category: post.category.id, limit: 4 });
  return (posts ?? []).filter((p) => p.id !== post.id).slice(0, 3);
}
