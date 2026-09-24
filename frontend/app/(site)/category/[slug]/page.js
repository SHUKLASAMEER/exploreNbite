import { notFound } from "next/navigation";
import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PostList from "@/components/public/PostList";
import Pagination from "@/components/public/Pagination";
import StateMessage from "@/components/public/StateMessage";
import PageHeader from "@/components/public/PageHeader";
import Breadcrumbs from "@/components/public/Breadcrumbs";
import { getPublicCategoryBySlug, getPublicPosts } from "@/lib/publicApi";
import { buildMetadata, buildBreadcrumbJsonLd, buildCollectionPageJsonLd, getSeoDefaults } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { category } = await getPublicCategoryBySlug(slug);
  if (!category) return {};
  const { siteName, description, ogImage } = await getSeoDefaults();
  return buildMetadata({
    path: `/category/${category.slug}`,
    title: category.name,
    description: [category.description, `Posts filed under ${category.name} on ${siteName}.`],
    fallbackDescription: description,
    imageAlt: `${category.name} — ${siteName}`,
    defaultImage: ogImage,
    siteName,
  });
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
      <TwoColumnLayout sidebar={<Sidebar layout="home" />}>
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

  // Home -> Category breadcrumb (shared by the visible trail and the
  // BreadcrumbList) + a CollectionPage node for the archive.
  const crumbs = [
    { name: "Home", path: "/" },
    { name: category.name, path: `/category/${category.slug}` },
  ];
  const jsonLd = [
    buildBreadcrumbJsonLd(crumbs),
    buildCollectionPageJsonLd({
      name: category.name,
      description: category.description || undefined,
      path: `/category/${category.slug}`,
    }),
  ];

  return (
    // The category name is the page's one <h1> (QA-013), in the same
    // PageHeader used by Books / Awards / CMS pages. The old live site had no
    // heading on category archives at all.
    <TwoColumnLayout sidebar={<Sidebar layout="home" />}>
      <JsonLd data={jsonLd} />
      <Breadcrumbs crumbs={crumbs} />
      <PageHeader title={category.name} />
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
