import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PageHeader from "@/components/public/PageHeader";
import PostList from "@/components/public/PostList";
import Pagination from "@/components/public/Pagination";
import StateMessage from "@/components/public/StateMessage";
import { getPublicPosts } from "@/lib/publicApi";

export const metadata = {
  title: "Search | Explore N Bite",
};

// Backs the sidebar's Search widget (a plain GET form to /search?q=...) —
// reuses the public posts list endpoint's existing `search` param
// (matches post title), no new backend endpoint needed.
export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const query = typeof params?.q === "string" ? params.q.trim() : "";
  const page = Number(params?.page) || 1;

  const { posts, pagination, error } = query
    ? await getPublicPosts({ search: query, page })
    : { posts: [], pagination: null, error: null };

  return (
    <TwoColumnLayout sidebar={<Sidebar layout="utility" />}>
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
