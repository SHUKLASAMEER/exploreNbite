import TwoColumnLayout from "@/components/public/TwoColumnLayout";
import Sidebar from "@/components/public/Sidebar";
import PostList from "@/components/public/PostList";
import Pagination from "@/components/public/Pagination";
import { getPublicPosts } from "@/lib/publicApi";

export const metadata = {
  title: "Explore N Bite",
  description: "Offbeat travel stories and food, one bite at a time.",
};

// Home = the blog index (all published posts, newest first, paginated) —
// same as the live site, which has no separate "/blog" route; the site
// root itself is the post feed.
export default async function Home({ searchParams }) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  // limit: 10 + sticky: true reproduces the live site's actual front page —
  // 10 posts/page, plus every Sticky post pinned above the rest on page 1
  // only (see lib/publicApi.js and post.service.js#list).
  const { posts, pagination, error } = await getPublicPosts({ page, limit: 10, sticky: true });

  return (
    <TwoColumnLayout sidebar={<Sidebar layout="home" />}>
      <PostList
        posts={posts}
        error={error}
        emptyTitle="No posts yet."
        emptyText="Check back soon — new stories are on the way."
      />
      {pagination ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          buildHref={(p) => (p === 1 ? "/" : `/?page=${p}`)}
        />
      ) : null}
    </TwoColumnLayout>
  );
}
