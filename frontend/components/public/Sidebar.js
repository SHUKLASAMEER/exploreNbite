import { getPublicPosts, getPublicAwards, getPublicSubscriberCount, getPublicAuthors } from "@/lib/publicApi";
import SearchWidget from "./SearchWidget";
import RecommendedPostWidget from "./RecommendedPostWidget";
import RecentPostsWidget from "./RecentPostsWidget";
import MediaBadgeWidget from "./MediaBadgeWidget";
import SurlyBadgeWidget from "./SurlyBadgeWidget";
import SocialWidget from "./SocialWidget";
import SubscribeWidget from "./SubscribeWidget";
import styles from "./Sidebar.module.css";

// Sidebar widget composition + order, verified against the live site's
// actual rendered sidebar markup (`.sidebar-right-wrap .ashe-widget` order)
// on "/", "/category/home/" and "/category/must-visit/" — not guessed:
//   - front page "/":     Search, Recommended post, Facebook, Subscribe,
//                          Twitter, Award photo, Tripoto badge, IndiBlogger
//                          badge, Sur.ly "Brilliantly SAFE!" badge (a
//                          faithful static reproduction of the live
//                          domain-verification widget — see
//                          SurlyBadgeWidget.js). Live's front page never
//                          shows Recent Posts at all.
//   - category archives:  identical stack, with Recent Posts prepended
//                          first (both /category/home/ and
//                          /category/must-visit/ — verified identical).
//   - post.html:           Recent Posts, then Search
//   - about/my-books/mentions-awards/work-with-me.html: Recommended Post,
//                          Recent Posts
//   - contact.html:        Search, Recommended Post, Recent Posts
const LAYOUTS = {
  home: ["search", "recommended", "facebook", "subscribe", "twitter", "award", "tripoto", "indiblogger", "surly"],
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
    "surly",
  ],
  post: ["recentPosts", "search"],
  page: ["recommended", "recentPosts"],
  contact: ["search", "recommended", "recentPosts"],
  utility: ["search", "recommended", "recentPosts"],
};

// The one contiguous block that becomes sticky: EXACTLY the three small
// badge widgets — Tripoto, IndiBlogger, Sur.ly. The "Awarded best travel &
// food writer" heading + trophy photo directly above them is deliberately
// NOT in here — it stays in normal flow (it's tall enough that including it
// pushed the badges out of view once the block pinned). Only the `home` /
// `archive` layouts include these keys; every other layout renders no
// sticky block. They're pulled out of the normal widget flow and rendered
// together inside a single `.stickyBadgeBlock` wrapper so all three move —
// and pin — as one unit. Order within the block follows the layout array.
const STICKY_BADGE_KEYS = new Set(["tripoto", "indiblogger", "surly"]);

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

  function renderWidget(key) {
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
      case "surly":
        return <SurlyBadgeWidget key={key} />;
      default:
        return null;
    }
  }

  // Everything except the three badges stays in normal flow — including the
  // award heading + trophy photo. The badge keys are grouped into one sticky
  // wrapper, rendered right after the normal widgets (their natural order in
  // the layouts that have them).
  const normalKeys = widgets.filter((key) => !STICKY_BADGE_KEYS.has(key));
  const badgeKeys = widgets.filter((key) => STICKY_BADGE_KEYS.has(key));

  return (
    <div className={styles.sidebarInner}>
      {normalKeys.map(renderWidget)}
      {badgeKeys.length > 0 ? (
        <div className={styles.stickyBadgeBlock}>{badgeKeys.map(renderWidget)}</div>
      ) : null}
    </div>
  );
}
