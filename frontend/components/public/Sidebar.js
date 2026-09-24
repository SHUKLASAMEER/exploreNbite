import { getPublicPosts, getPublicAwards, getPublicSubscriberCount, getPublicSettings, getPublicSidebarConfig } from "@/lib/publicApi";
import SearchWidget from "./SearchWidget";
import RecommendedPostWidget from "./RecommendedPostWidget";
import RecentPostsWidget from "./RecentPostsWidget";
import MediaBadgeWidget from "./MediaBadgeWidget";
import SurlyBadgeWidget from "./SurlyBadgeWidget";
import SocialWidget from "./SocialWidget";
import SubscribeWidget from "./SubscribeWidget";
import styles from "./Sidebar.module.css";

// Sidebar widget composition + order is admin-editable per layout (see the
// admin Sidebar screen -> GET /api/sidebar). Which layout each route uses is
// fixed here in code, so every page of the same kind gets the same sidebar:
//   - "home" — the one full blog sidebar: home, category archives, single
//     posts, search results and author archives (and the admin post preview).
//   - "page" — compact: Books, Awards, standard CMS pages incl. Work With Me,
//     and the 404 page (the <Sidebar /> default).
//   - "contact" — compact: the Contact page.
// "archive", "post" and "utility" remain in the registry but no route renders
// them any more.
//
// This map is only the fallback used when the config fetch fails or a layout
// has no rows yet. The full "home" order is the canonical one: Search,
// Recommended post, Recent Posts, Subscribe, Facebook, Twitter, Award photo,
// then the Tripoto / IndiBlogger / Sur.ly badges.
const DEFAULT_LAYOUTS = {
  home: ["search", "recommended", "recentPosts", "subscribe", "facebook", "twitter", "award", "tripoto", "indiblogger", "surly"],
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
// badge widgets — Tripoto, IndiBlogger, Sur.ly. This is code-owned display
// behavior (not an editorial setting): the "Awarded best travel & food
// writer" heading + trophy photo directly above them is deliberately NOT in
// here — it stays in normal flow (it's tall enough that including it pushed
// the badges out of view once the block pinned). Order within the block
// follows the resolved widget list.
const STICKY_BADGE_KEYS = new Set(["tripoto", "indiblogger", "surly"]);

// Resolves the active widget key list for `layout` from the admin config,
// falling back to DEFAULT_LAYOUTS when the layout is missing / the fetch
// failed. An admin who disables every widget for a layout gets an empty
// sidebar for it — that's a real choice, so only a missing array falls back.
function resolveWidgetKeys(config, layout) {
  const rows = config?.[layout];
  if (Array.isArray(rows)) {
    return rows.filter((row) => row.enabled).map((row) => row.widgetKey);
  }
  return DEFAULT_LAYOUTS[layout] ?? DEFAULT_LAYOUTS.page;
}

// Self-fetching sidebar — every page that needs it just renders
// <Sidebar layout="..." /> instead of each fetching posts/awards itself.
// Recommended Post + Recent Posts share a single small getPublicPosts
// fetch: both are independent "N most recent posts" widgets on the live
// site (they legitimately overlap), so this fetches one top-5 batch and
// slices it two different ways. `excludePostId` drops the post currently
// being viewed (single-post page) so it can't recommend itself.
export default async function Sidebar({ layout = "page", excludePostId } = {}) {
  const { config: sidebarConfig } = await getPublicSidebarConfig();
  const widgets = resolveWidgetKeys(sidebarConfig, layout);

  const needsPosts = widgets.includes("recommended") || widgets.includes("recentPosts");
  const needsAwards = widgets.includes("award") || widgets.includes("tripoto") || widgets.includes("indiblogger");
  const needsSubscriberCount = widgets.includes("subscribe");
  // The Facebook / Twitter widgets link to the site-wide social URLs in
  // Settings — the single source of truth shared with the header + footer
  // (lib/socialLinks.js), no longer a second copy on the Author record.
  const needsSocialLinks = widgets.includes("facebook") || widgets.includes("twitter");

  const [{ posts }, { awards }, { count: subscriberCount }, { settings }] = await Promise.all([
    needsPosts ? getPublicPosts({ page: 1, limit: 5 }) : Promise.resolve({ posts: [] }),
    needsAwards ? getPublicAwards() : Promise.resolve({ awards: [] }),
    needsSubscriberCount ? getPublicSubscriberCount() : Promise.resolve({ count: null }),
    needsSocialLinks ? getPublicSettings() : Promise.resolve({ settings: null }),
  ]);

  const filteredPosts = (posts ?? []).filter((post) => post.id !== excludePostId);
  const recommendedPosts = filteredPosts.slice(0, 2);
  const recommendedAuthor = recommendedPosts[0]?.author ?? filteredPosts[0]?.author ?? null;
  const recentPosts = filteredPosts.slice(0, 5);

  const awardList = awards ?? [];
  // Badges are selected by their explicit Award.badgeSlot (set in the admin),
  // never by matching the award title / source link.
  const awardPhoto = awardList.find((award) => award.badgeSlot === "award_photo") ?? null;
  const tripotoBadge = awardList.find((award) => award.badgeSlot === "tripoto") ?? null;
  const indiBloggerBadge = awardList.find((award) => award.badgeSlot === "indiblogger") ?? null;

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
            heading="Follow me on Facebook"
            headingHref={settings?.socialFacebook}
            label="View on Facebook"
            href={settings?.socialFacebook}
          />
        );
      case "twitter":
        return (
          <SocialWidget
            key={key}
            heading="Follow me on Twitter"
            label="Follow on Twitter"
            href={settings?.socialTwitter}
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
