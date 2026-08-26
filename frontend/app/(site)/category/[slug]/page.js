import { notFound } from "next/navigation";
import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PostList from "@/components/public/PostList";
import Pagination from "@/components/public/Pagination";
import StateMessage from "@/components/public/StateMessage";
import { getPublicCategoryBySlug, getPublicPosts } from "@/lib/publicApi";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { category } = await getPublicCategoryBySlug(slug);
  if (!category) return {};
  return { title: `${category.name} | Explore N Bite`, description: category.description ?? undefined };
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  const { category, error: categoryError, notFound: categoryNotFound } = await getPublicCategoryBySlug(slug);

  if (categoryNotFound) {
    notFound();
  }

  if (categoryError || !category) {
    return (
      <TwoColumnLayout sidebar={<Sidebar layout="archive" />}>
        <StateMessage kind="error" title="Couldn't load this category.">
          {categoryError}
        </StateMessage>
      </TwoColumnLayout>
    );
  }

  // limit: 10 matches the live site's category archives exactly (verified
  // against explorenbite.com/category/must-visit/ and /category/home/,
  // both 10 posts/page) — no sticky bump here, category archives stay
  // plain date-desc on the live site too.
  const { posts, pagination, error } = await getPublicPosts({ category: category.id, page, limit: 10 });

  return (
    // No page title/description here — the live site's category archives
    // (/category/home/, /category/must-visit/) render straight into the
    // post grid with no <h1> or intro text at all (verified against the
    // live HTML; only the <title> tag and browser tab carry the category
    // name). Matching that exactly rather than guessing a header belongs.
    <TwoColumnLayout sidebar={<Sidebar layout="archive" />}>
      <PostList
        posts={posts}
        error={error}
        emptyTitle="No posts in this category yet."
        emptyText="Check back soon."
      />
      {pagination ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          buildHref={(p) => (p === 1 ? `/category/${slug}` : `/category/${slug}?page=${p}`)}
        />
      ) : null}
    </TwoColumnLayout>
  );
}
