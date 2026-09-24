import { serverApiFetch } from "./serverApi";

// Centralized data access for public-site Server Components — Header,
// Footer, and (in later phases) page content all call these instead of
// duplicating fetch + error-handling logic. Uses serverApiFetch (not the
// client-only apiFetch in lib/api.js) since every current caller is a
// Server Component; these hit GET /api/menu and GET /api/settings, the
// public, unauthenticated read routes added alongside the existing
// /admin/menu and /admin/settings admin routes (see
// backend/src/routes/index.js). cache: "no-store" (set inside
// serverApiFetch) keeps this in sync with admin edits — CMS-managed content
// should never be served stale from a build-time cache.
async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Returns { settings, error }. `settings` is null when the fetch failed;
// `error` is a human-readable message for that case. A missing/failed fetch
// never throws — every caller renders a sensible fallback instead.
export async function getPublicSettings() {
  try {
    const res = await serverApiFetch("/api/settings");
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { settings: null, error: data?.error?.message ?? "Failed to load site settings." };
    }
    return { settings: data?.settings ?? null, error: null };
  } catch {
    return { settings: null, error: "Failed to load site settings." };
  }
}

// Returns { config, error }. `config` is { [layout]: [{ widgetKey, enabled }] }
// — the admin-managed sidebar widget composition per layout (GET /api/sidebar).
// null + a populated `error` on failure; the Sidebar component falls back to
// its built-in default composition in that case.
export async function getPublicSidebarConfig() {
  try {
    const res = await serverApiFetch("/api/sidebar");
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { config: null, error: data?.error?.message ?? "Failed to load the sidebar configuration." };
    }
    return { config: data?.config ?? null, error: null };
  } catch {
    return { config: null, error: "Failed to load the sidebar configuration." };
  }
}

// Returns { menuItems, error }. `menuItems` is [] for "no items configured
// yet" (a legitimate empty state) vs null + a populated `error` for "the
// request itself failed" — callers distinguish the two rather than treating
// both as "no nav".
export async function getPublicMenu() {
  try {
    const res = await serverApiFetch("/api/menu");
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { menuItems: null, error: data?.error?.message ?? "Failed to load the navigation menu." };
    }
    return { menuItems: data?.menuItems ?? [], error: null };
  } catch {
    return { menuItems: null, error: "Failed to load the navigation menu." };
  }
}

// A menu item's admin shape (see backend/src/services/menuItem.service.js)
// includes the resolved page/category target, but not a ready-to-use href —
// this is the one place that turns { linkType, page, category, customUrl }
// into a URL, so nothing else in the public UI re-implements this branching.
// /pages/[slug] and /category/[slug] (Phase 3 Part 2) are what these now
// resolve to. custom_url is always a fully-qualified URL (validated in
// backend/src/utils/validation/menuItems.js), so it's returned as-is.
export function resolveMenuItemHref(item) {
  // A "group" is a dropdown parent with no destination of its own.
  if (item.linkType === "group") {
    return null;
  }
  if (item.linkType === "page") {
    return item.page?.slug ? `/pages/${item.page.slug}` : null;
  }
  if (item.linkType === "category") {
    return item.category?.slug ? `/category/${item.category.slug}` : null;
  }
  if (item.linkType === "custom_url") {
    return item.customUrl || null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

// Returns { posts, pagination, error }. `params` may include `page`,
// `category` (a Category id — resolve a slug via getPublicCategoryBySlug()
// first), `author` (an Author id), `search` (matches post title), `limit`
// (page size — the backend already accepts this for every list caller, see
// postService.list()'s clampInt(query.limit, ...), just unused by public
// callers until the sidebar's Recommended/Recent Posts widgets needed a
// small fixed-size fetch instead of a full paginated page). Only published
// posts are ever returned — GET /api/posts forces that server-side
// (backend/src/controllers/post.controller.js#listPublic), so there's no
// client-side filtering to get wrong here.
export async function getPublicPosts(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.category) qs.set("category", String(params.category));
  if (params.author) qs.set("author", String(params.author));
  if (params.search) qs.set("search", params.search);
  if (params.limit) qs.set("limit", String(params.limit));
  // Opts into the live site's front-page-only "sticky posts pinned to page
  // 1" pagination behavior — see backend/src/services/post.service.js#list.
  // Only the home page passes this; everything else (category archives,
  // the sidebar's small Recommended/Recent Posts fetches) leaves it off,
  // matching what the live site itself does.
  if (params.sticky) qs.set("sticky", "1");
  const query = qs.toString();

  try {
    const res = await serverApiFetch(`/api/posts${query ? `?${query}` : ""}`);
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { posts: null, pagination: null, error: data?.error?.message ?? "Failed to load posts." };
    }
    return { posts: data?.data ?? [], pagination: data?.pagination ?? null, error: null };
  } catch {
    return { posts: null, pagination: null, error: "Failed to load posts." };
  }
}

// Returns { post, error, notFound }. `notFound` is true only for a genuine
// 404 (no such slug, or the post isn't published) — callers use that to
// trigger Next's notFound() rather than rendering a generic error banner.
export async function getPublicPostBySlug(slug) {
  try {
    const res = await serverApiFetch(`/api/posts/${encodeURIComponent(slug)}`);
    if (res.status === 404) {
      return { post: null, error: null, notFound: true };
    }
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { post: null, error: data?.error?.message ?? "Failed to load this post.", notFound: false };
    }
    // `adjacent`: { previous, next } published posts in the same primary
    // category (end-of-article navigation); either side may be null.
    return { post: data?.post ?? null, adjacent: data?.adjacent ?? null, error: null, notFound: false };
  } catch {
    return { post: null, error: "Failed to load this post.", notFound: false };
  }
}

// Returns { comments, error }. Approved comments only (see
// backend/src/services/comment.service.js#listPublicByPost) — pending/spam
// stay admin-only.
export async function getPublicComments(postId) {
  try {
    const res = await serverApiFetch(`/api/posts/${postId}/comments`);
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { comments: null, error: data?.error?.message ?? "Failed to load comments." };
    }
    return { comments: data?.comments ?? [], error: null };
  } catch {
    return { comments: null, error: "Failed to load comments." };
  }
}

// Returns { count, error }. Backs the sidebar Subscribe widget's "Join N
// other subscribers" line (live site: Jetpack's own subscription widget
// shows the same thing) — real active-subscriber count, no placeholder.
export async function getPublicSubscriberCount() {
  try {
    const res = await serverApiFetch("/api/subscribers/count");
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { count: null, error: data?.error?.message ?? "Failed to load subscriber count." };
    }
    return { count: data?.count ?? 0, error: null };
  } catch {
    return { count: null, error: "Failed to load subscriber count." };
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getPublicCategories() {
  try {
    const res = await serverApiFetch("/api/categories");
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { categories: null, error: data?.error?.message ?? "Failed to load categories." };
    }
    return { categories: data?.categories ?? [], error: null };
  } catch {
    return { categories: null, error: "Failed to load categories." };
  }
}

export async function getPublicCategoryBySlug(slug) {
  try {
    const res = await serverApiFetch(`/api/categories/${encodeURIComponent(slug)}`);
    if (res.status === 404) {
      return { category: null, error: null, notFound: true };
    }
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { category: null, error: data?.error?.message ?? "Failed to load this category.", notFound: false };
    }
    return { category: data?.category ?? null, error: null, notFound: false };
  } catch {
    return { category: null, error: "Failed to load this category.", notFound: false };
  }
}

// ---------------------------------------------------------------------------
// Authors
// ---------------------------------------------------------------------------

export async function getPublicAuthors() {
  try {
    const res = await serverApiFetch("/api/authors");
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { authors: null, error: data?.error?.message ?? "Failed to load authors." };
    }
    return { authors: data?.authors ?? [], error: null };
  } catch {
    return { authors: null, error: "Failed to load authors." };
  }
}

// Author has no slug column (see prisma/schema.prisma) — id-based lookup
// only, hence /authors/[id] rather than /authors/[slug].
export async function getPublicAuthorById(id) {
  try {
    const res = await serverApiFetch(`/api/authors/${encodeURIComponent(id)}`);
    if (res.status === 404) {
      return { author: null, error: null, notFound: true };
    }
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { author: null, error: data?.error?.message ?? "Failed to load this author.", notFound: false };
    }
    return { author: data?.author ?? null, error: null, notFound: false };
  } catch {
    return { author: null, error: "Failed to load this author.", notFound: false };
  }
}

// ---------------------------------------------------------------------------
// Pages (generic CMS pages — About, Contact, Work With Me, etc.)
// ---------------------------------------------------------------------------

export async function getPublicPageBySlug(slug) {
  try {
    const res = await serverApiFetch(`/api/pages/${encodeURIComponent(slug)}`);
    if (res.status === 404) {
      return { page: null, error: null, notFound: true };
    }
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { page: null, error: data?.error?.message ?? "Failed to load this page.", notFound: false };
    }
    return { page: data?.page ?? null, error: null, notFound: false };
  } catch {
    return { page: null, error: "Failed to load this page.", notFound: false };
  }
}

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------

export async function getPublicBooks() {
  try {
    const res = await serverApiFetch("/api/books");
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { books: null, error: data?.error?.message ?? "Failed to load books." };
    }
    return { books: data?.books ?? [], error: null };
  } catch {
    return { books: null, error: "Failed to load books." };
  }
}

// ---------------------------------------------------------------------------
// Awards
// ---------------------------------------------------------------------------

export async function getPublicAwards() {
  try {
    const res = await serverApiFetch("/api/awards");
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return { awards: null, error: data?.error?.message ?? "Failed to load awards." };
    }
    return { awards: data?.awards ?? [], error: null };
  } catch {
    return { awards: null, error: "Failed to load awards." };
  }
}
