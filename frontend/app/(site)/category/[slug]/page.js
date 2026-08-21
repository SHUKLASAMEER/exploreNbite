import { notFound } from "next/navigation";
import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PostList from "@/components/public/PostList";
import Pagination from "@/components/public/Pagination";
import PageHeader from "@/components/public/PageHeader";
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
      <TwoColumnLayout sidebar={<Sidebar />}>
        <StateMessage kind="error" title="Couldn't load this category.">
          {categoryError}
        </StateMessage>
      </TwoColumnLayout>
    );
  }

  const { posts, pagination, error } = await getPublicPosts({ category: category.id, page });

  return (
    <TwoColumnLayout sidebar={<Sidebar />}>
      <PageHeader title={category.name} description={category.description} />
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
