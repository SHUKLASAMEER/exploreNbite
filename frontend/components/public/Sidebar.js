import { getPublicPosts, getPublicAwards, getPublicSubscriberCount, getPublicAuthors } from "@/lib/publicApi";
import SearchWidget from "./SearchWidget";
import RecommendedPostWidget from "./RecommendedPostWidget";
import RecentPostsWidget from "./RecentPostsWidget";
import MediaBadgeWidget from "./MediaBadgeWidget";
import SocialWidget from "./SocialWidget";
import SubscribeWidget from "./SubscribeWidget";

// Sidebar widget composition + order, verified against the live site's
// actual rendered sidebar markup (`.sidebar-right-wrap .ashe-widget` order)
// on "/", "/category/home/" and "/category/must-visit/" — not guessed:
//   - front page "/":     Search, Recommended post, Facebook, Subscribe,
//                          Twitter, Award photo, Tripoto badge, IndiBlogger
//                          badge. (Live also shows a Sur.ly "site safety"
//                          verification badge last — that one is a
//                          domain-verification service tied to
//                          explorenbite.com specifically and can't be
//                          reproduced honestly for localhost, so it's
//                          omitted; see Sidebar's own report notes.) Live's
//                          front page never shows Recent Posts at all.
//   - category archives:  identical stack, with Recent Posts prepended
//                          first (both /category/home/ and
//                          /category/must-visit/ — verified identical).
//   - post.html:           Recent Posts, then Search
//   - about/my-books/mentions-awards/work-with-me.html: Recommended Post,
//                          Recent Posts
//   - contact.html:        Search, Recommended Post, Recent Posts
const LAYOUTS = {
  home: ["search", "recommended", "facebook", "subscribe", "twitter", "award", "tripoto", "indiblogger"],
  archive: [
    "recentPosts",
    "search",
    "recommended",
    "facebook",
    "subscribe",
    "twitter",
    "award",
    "tripoto",
    "indiblogger",
  ],
  post: ["recentPosts", "search"],
  page: ["recommended", "recentPosts"],
  contact: ["search", "recommended", "recentPosts"],
  utility: ["search", "recommended", "recentPosts"],
};

// Matches specific live-site badges within the CMS's Award list by content
// rather than a fixed id (ids aren't stable across environments) — same
// "identify by real content" rule as everywhere else in this sync. Awards
// that don't match any of these (e.g. the "Special Mention" award, which
// doesn't appear in the live sidebar either) are simply not shown here.
function findAward(awards, matcher) {
  return awards.find(matcher) ?? null;
}

// Self-fetching sidebar — every page that needs it just renders
// <Sidebar layout="..." /> instead of each fetching posts/awards itself.
// Recommended Post + Recent Posts share a single small getPublicPosts
// fetch: both are independent "N most recent posts" widgets on the live
// site (they legitimately overlap — live's Recommended list and Recent
// Posts list share their top 2 entries, verified against the live HTML),
// so this fetches one top-5 batch and slices it two different ways rather
// than de-duplicating. `excludePostId` drops the post currently being
// viewed (single-post page) so it can't recommend itself.
export default async function Sidebar({ layout = "page", excludePostId } = {}) {
  const widgets = LAYOUTS[layout] ?? LAYOUTS.page;
  const needsPosts = widgets.includes("recommended") || widgets.includes("recentPosts");
  const needsAwards = widgets.includes("award") || widgets.includes("tripoto") || widgets.includes("indiblogger");
  const needsSubscriberCount = widgets.includes("subscribe");
  // facebookUrl/twitterUrl aren't part of the (deliberately slim) author
  // shape embedded on a post — fetched separately, only when a social
  // widget is actually in this layout.
  const needsSocialLinks = widgets.includes("facebook") || widgets.includes("twitter");

  const [{ posts }, { awards }, { count: subscriberCount }, { authors }] = await Promise.all([
    needsPosts ? getPublicPosts({ page: 1, limit: 5 }) : Promise.resolve({ posts: [] }),
    needsAwards ? getPublicAwards() : Promise.resolve({ awards: [] }),
    needsSubscriberCount ? getPublicSubscriberCount() : Promise.resolve({ count: null }),
    needsSocialLinks ? getPublicAuthors() : Promise.resolve({ authors: [] }),
  ]);

  const filteredPosts = (posts ?? []).filter((post) => post.id !== excludePostId);
  const recommendedPosts = filteredPosts.slice(0, 2);
  const recommendedAuthor = recommendedPosts[0]?.author ?? filteredPosts[0]?.author ?? null;
  const recentPosts = filteredPosts.slice(0, 5);
  // Single-author site — the one Author record carries the real social URLs.
  const socialAuthor = (authors ?? [])[0] ?? null;

  const awardList = awards ?? [];
  const awardPhoto = findAward(awardList, (a) => /travel and food writer/i.test(a.title));
  const tripotoBadge = findAward(awardList, (a) => a.sourceLink?.includes("tripoto.com"));
  const indiBloggerBadge = findAward(awardList, (a) => a.sourceLink?.includes("indiblogger"));

  return (
    <div>
      {widgets.map((key) => {
        switch (key) {
          case "search":
            return <SearchWidget key={key} />;
          case "recommended":
            return <RecommendedPostWidget key={key} author={recommendedAuthor} posts={recommendedPosts} />;
          case "facebook":
            return (
              <SocialWidget
                key={key}
                heading="Recent posts"
                headingHref={socialAuthor?.facebookUrl}
                label="View on Facebook"
                href={socialAuthor?.facebookUrl}
              />
            );
          case "twitter":
            return (
              <SocialWidget
                key={key}
                heading="Follow me on Twitter"
                label="Follow on Twitter"
                href={socialAuthor?.twitterUrl}
              />
            );
          case "subscribe":
            return <SubscribeWidget key={key} count={subscriberCount} />;
          case "recentPosts":
            return <RecentPostsWidget key={key} posts={recentPosts} />;
          case "award":
            return awardPhoto ? (
              <MediaBadgeWidget
                key={key}
                heading={awardPhoto.title}
                imageUrl={awardPhoto.imageUrl}
                imageWidth={240}
                imageHeight={300}
              />
            ) : null;
          case "tripoto":
            return tripotoBadge ? (
              <MediaBadgeWidget
                key={key}
                imageUrl={tripotoBadge.imageUrl}
                imageWidth={146}
                imageHeight={145}
                alt="Tripoto"
                href={tripotoBadge.sourceLink}
              />
            ) : null;
          case "indiblogger":
            return indiBloggerBadge ? (
              <MediaBadgeWidget
                key={key}
                heading={indiBloggerBadge.title}
                imageUrl={indiBloggerBadge.imageUrl}
                imageWidth={145}
                imageHeight={128}
                alt="IndiBlogger - The Largest Indian Blogger Community"
                href={indiBloggerBadge.sourceLink}
              />
            ) : null;
          default:
            return null;
        }
      })}
    </div>
  );
}
