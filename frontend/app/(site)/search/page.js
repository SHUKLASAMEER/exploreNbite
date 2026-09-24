import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PageHeader from "@/components/public/PageHeader";
import PostList from "@/components/public/PostList";
import Pagination from "@/components/public/Pagination";
import StateMessage from "@/components/public/StateMessage";
import { getPublicPosts } from "@/lib/publicApi";
import { buildMetadata, getSeoDefaults } from "@/lib/seo";

// Search-result pages are useful to visitors but not something search
// engines should index (thin, query-dependent, near-infinite variants).
export async function generateMetadata() {
  const { siteName, description, ogImage } = await getSeoDefaults();
  return buildMetadata({
    path: "/search",
    title: "Search",
    description: `Search posts on ${siteName}.`,
    fallbackDescription: description,
    imageAlt: `Search — ${siteName}`,
    defaultImage: ogImage,
    siteName,
    noindex: true,
  });
}

// Backs the sidebar's Search widget (a plain GET form to /search?q=...) —
// reuses the public posts list endpoint's existing `search` param, which
// now matches a query against the post title, description, HTML content,
// and associated tag / category names + slugs (relevance-ordered, published
// posts only — see backend post.service.searchPublished). Same endpoint,
// same params, same response shape; no frontend change beyond this note.
export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const query = typeof params?.q === "string" ? params.q.trim() : "";
  const page = Number(params?.page) || 1;

  const { posts, pagination, error } = query
    ? await getPublicPosts({ search: query, page })
    : { posts: [], pagination: null, error: null };

  return (
    <TwoColumnLayout sidebar={<Sidebar layout="home" />}>
      <PageHeader title={query ? `Search results for “${query}”` : "Search"} />
      {!query ? (
        <StateMessage kind="empty" title="Enter a search term to find posts." />
      ) : (
        <>
          <PostList
            posts={posts}
            error={error}
            emptyTitle="No posts matched your search."
            emptyText="Try a different keyword."
          />
          {pagination ? (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              buildHref={(p) => `/search?q=${encodeURIComponent(query)}&page=${p}`}
            />
          ) : null}
        </>
      )}
    </TwoColumnLayout>
  );
}
