import { getPublicPosts, getPublicAwards } from "@/lib/publicApi";
import SearchWidget from "./SearchWidget";
import RecommendedPostWidget from "./RecommendedPostWidget";
import RecentPostsWidget from "./RecentPostsWidget";
import BadgesWidget from "./BadgesWidget";
import SubscribeWidget from "./SubscribeWidget";

// Sidebar widget composition, per reference/exploreNbite UI mockup, differs
// by page — unlike the old fixed global widget stack, each route asks for
// the exact stack (and order) its mockup shows:
//   - index.html:            Search, Recommended Post, Recent Posts, Badges
//   - category.html:         Recent Posts only (explicitly called out in
//                             that mockup's own annotation)
//   - post.html:              Recent Posts, then Search
//   - about/my-books/mentions-awards/work-with-me.html: Recommended Post,
//                             Recent Posts
//   - contact.html:           Search, Recommended Post, Recent Posts
// "subscribe" (the Subscribe-to-Blog widget) never appears in any mockup —
// it's kept on the home page only as a deliberate, documented addition so
// the real POST /api/subscribers feature stays reachable from the public
// site rather than being silently dropped.
const LAYOUTS = {
  home: ["search", "recommended", "subscribe", "recentPosts", "badges"],
  archive: ["recentPosts"],
  post: ["recentPosts", "search"],
  page: ["recommended", "recentPosts"],
  contact: ["search", "recommended", "recentPosts"],
  utility: ["search", "recommended", "recentPosts"],
};

// Self-fetching sidebar — every page that needs it just renders
// <Sidebar layout="..." /> instead of each fetching posts/awards itself.
// Recommended Post + Recent Posts share a single small getPublicPosts
// fetch (no separate "featured post" request needed): the newest post is
// "Recommended", the next few are "Recent Posts". `excludePostId` drops the
// post currently being viewed (single-post page) so it can't recommend
// itself.
export default async function Sidebar({ layout = "page", excludePostId } = {}) {
  const widgets = LAYOUTS[layout] ?? LAYOUTS.page;
  const needsPosts = widgets.includes("recommended") || widgets.includes("recentPosts");
  const needsAwards = widgets.includes("badges");

  const [{ posts }, { awards }] = await Promise.all([
    needsPosts ? getPublicPosts({ page: 1, limit: 6 }) : Promise.resolve({ posts: [] }),
    needsAwards ? getPublicAwards() : Promise.resolve({ awards: [] }),
  ]);

  const filteredPosts = (posts ?? []).filter((post) => post.id !== excludePostId);
  const showRecommended = widgets.includes("recommended");
  const recommendedPost = showRecommended ? (filteredPosts[0] ?? null) : null;
  const recentPosts = filteredPosts.slice(showRecommended ? 1 : 0, showRecommended ? 6 : 5);
  const badgeAwards = (awards ?? []).slice(0, 3);

  return (
    <div>
      {widgets.map((key) => {
        switch (key) {
          case "search":
            return <SearchWidget key={key} />;
          case "recommended":
            return <RecommendedPostWidget key={key} post={recommendedPost} />;
          case "subscribe":
            return <SubscribeWidget key={key} />;
          case "recentPosts":
            return <RecentPostsWidget key={key} posts={recentPosts} />;
          case "badges":
            return <BadgesWidget key={key} awards={badgeAwards} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
