import { notFound } from "next/navigation";
import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PostList from "@/components/public/PostList";
import Pagination from "@/components/public/Pagination";
import StateMessage from "@/components/public/StateMessage";
import { getPublicAuthorById, getPublicPosts } from "@/lib/publicApi";
import { buildMetadata, getSeoDefaults } from "@/lib/seo";
import styles from "@/components/public/SinglePost.module.css";

// Author archive — bio + their published posts. Route is /authors/[id],
// not [slug]: Author has no slug column in the schema (confirmed against
// prisma/schema.prisma), id-based lookup is the only option without adding
// one, which Phase 3's scope explicitly says not to do speculatively.
export async function generateMetadata({ params }) {
  const { id } = await params;
  const { author } = await getPublicAuthorById(id);
  if (!author) return {};
  const { siteName, ogImage } = await getSeoDefaults();
  return buildMetadata({
    path: `/authors/${author.id}`,
    title: author.name,
    description: author.bio ?? `Posts by ${author.name} on ${siteName}.`,
    image: author.photoUrl ?? undefined,
    defaultImage: ogImage,
    siteName,
  });
}

export default async function AuthorPage({ params, searchParams }) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const { author, error: authorError, notFound: authorNotFound } = await getPublicAuthorById(id);

  if (authorNotFound) {
    notFound();
  }

  if (authorError || !author) {
    return (
      <TwoColumnLayout sidebar={<Sidebar layout="home" />}>
        <StateMessage kind="error" title="Couldn't load this author.">
          {authorError}
        </StateMessage>
      </TwoColumnLayout>
    );
  }

  const { posts, pagination, error } = await getPublicPosts({ author: author.id, page });

  return (
    <TwoColumnLayout sidebar={<Sidebar layout="home" />}>
      <div className={styles.authorBox} style={{ marginTop: 0, borderTop: "none", paddingTop: 0, marginBottom: 30 }}>
        {author.photoUrl ? (
          <img src={author.photoUrl} alt={author.name} className={styles.authorAvatar} />
        ) : (
          <span className={styles.authorInitial} aria-hidden="true">
            {author.name?.[0] ?? "?"}
          </span>
        )}
        <div>
          <p className={styles.authorName}>{author.name}</p>
          {author.bio ? <p className={styles.authorBio}>{author.bio}</p> : null}
        </div>
      </div>

      <PostList
        posts={posts}
        error={error}
        emptyTitle="No posts by this author yet."
      />
      {pagination ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          buildHref={(p) => (p === 1 ? `/authors/${id}` : `/authors/${id}?page=${p}`)}
        />
      ) : null}
    </TwoColumnLayout>
  );
}
