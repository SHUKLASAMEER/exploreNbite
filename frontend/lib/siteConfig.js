// Canonical public origin of the site. Used for metadataBase, the sitemap,
// robots.txt, per-page canonical URLs, and absolute OpenGraph/Twitter image
// URLs. Deliberately never hardcoded to a production domain — set
// NEXT_PUBLIC_SITE_URL per environment (see .env.example). Falls back to the
// local dev origin only when NODE_ENV !== "production"; a production build
// with the variable unset fails fast rather than silently emitting
// localhost canonicals into the index.
const raw = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");

if (process.env.NODE_ENV === "production") {
  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required in production (e.g. https://www.explorenbite.com). " +
        "Set it in the deployment environment before building."
    );
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(raw)) {
    // Warn, not throw — see the matching note in lib/api.js. `next build`
    // forces NODE_ENV=production even for a local build check.
    console.warn(
      "⚠  NEXT_PUBLIC_SITE_URL points at localhost in a production build — canonical URLs, the sitemap and OG tags will be wrong. Set it to the real public origin before deploying."
    );
  }
}

// Localhost fallback is dead-code-eliminated from a production bundle
// (`process.env.NODE_ENV` is inlined at build time; production also throws
// above if `raw` is missing or localhost).
export const SITE_URL = raw || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
export const SITE_NAME = "Explore N Bite";

// Build an absolute URL for `path` against the canonical origin. Used for
// canonical tags and absolute OG image URLs (which social scrapers require).
export function absoluteUrl(path = "/") {
  try {
    return new URL(path, SITE_URL).toString();
  } catch {
    return SITE_URL;
  }
}
