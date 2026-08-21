import { notFound } from "next/navigation";
import Link from "next/link";
import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import ProseContent from "@/components/public/ProseContent";
import CommentList from "@/components/public/CommentList";
import CommentForm from "@/components/public/CommentForm";
import StateMessage from "@/components/public/StateMessage";
import { getPublicPostBySlug, getPublicComments } from "@/lib/publicApi";
import { formatDate } from "@/lib/formatDate";
import styles from "@/components/public/SinglePost.module.css";
import commentStyles from "@/components/public/Comments.module.css";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { post } = await getPublicPostBySlug(slug);
  if (!post) return {};
  return { title: `${post.title} | Explore N Bite`, description: post.shortDescription ?? undefined };
}

export default async function SinglePostPage({ params }) {
  const { slug } = await params;
  const { post, error, notFound: postNotFound } = await getPublicPostBySlug(slug);

  if (postNotFound) {
    notFound();
  }

  if (error || !post) {
    return (
      <TwoColumnLayout sidebar={<Sidebar />}>
        <StateMessage kind="error" title="Couldn't load this post.">
          {error}
        </StateMessage>
      </TwoColumnLayout>
    );
  }

  const { comments, error: commentsError } = await getPublicComments(post.id);

  return (
    <TwoColumnLayout sidebar={<Sidebar />}>
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
          <div className={styles.authorBox}>
            <span className={styles.authorInitial} aria-hidden="true">
              {post.author.name?.[0] ?? "?"}
            </span>
            <div>
              <p className={styles.authorName}>
                <Link href={`/authors/${post.author.id}`}>{post.author.name}</Link>
              </p>
            </div>
          </div>
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
