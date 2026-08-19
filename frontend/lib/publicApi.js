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
//
// Route note: /pages/[slug] and /category/[slug] are placeholders — those
// public content routes are out of scope for this phase (Phase 3 Part 1 is
// nav/layout foundation only) and don't exist yet, so page/category links
// will 404 until a later phase adds them. custom_url is always a
// fully-qualified URL (validated in backend/src/utils/validation/menuItems.js),
// so it's returned as-is.
export function resolveMenuItemHref(item) {
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
