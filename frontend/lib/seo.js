import { SITE_NAME, absoluteUrl } from "./siteConfig";

// One place that assembles a Next.js Metadata object with a canonical URL
// plus matching OpenGraph and Twitter card blocks, so every public route
// produces consistent share/SEO output instead of each page hand-rolling a
// partial `{ title, description }`. Visual UI is unaffected — this only
// changes <head>.
//
// - `path`      absolute-from-root path of the current page (e.g. "/posts/foo")
// - `title`     already-composed <title> text
// - `description` plain-text meta description (falls back to the site tagline)
// - `image`     absolute or site-relative image URL for og:image (optional)
// - `type`      "website" (default) or "article"
// - `noindex`   true to emit robots: { index:false, follow:false }
// - `publishedTime` / `modifiedTime` / `authors` — article-only extras
const DEFAULT_DESCRIPTION = "Offbeat travel stories and food, one bite at a time — by Sweta Papaiyawala.";

export function buildMetadata({
  path = "/",
  title,
  description,
  image,
  type = "website",
  noindex = false,
  publishedTime,
  modifiedTime,
  authors,
} = {}) {
  const canonical = absoluteUrl(path);
  const desc = (description && String(description).trim()) || DEFAULT_DESCRIPTION;
  const ogImages = image ? [{ url: absoluteUrl(image) }] : undefined;
  // `title` may be a plain string (gets the "| Explore N Bite" template
  // applied by the root layout) or { absolute: "…" } to opt out of it.
  const titleText = typeof title === "string" ? title : title?.absolute || SITE_NAME;

  const metadata = {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      type,
      url: canonical,
      siteName: SITE_NAME,
      title: titleText,
      description: desc,
      images: ogImages,
      ...(type === "article"
        ? {
            publishedTime: publishedTime || undefined,
            modifiedTime: modifiedTime || undefined,
            authors: authors || undefined,
          }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: titleText,
      description: desc,
      images: image ? [absoluteUrl(image)] : undefined,
    },
  };

  if (noindex) {
    metadata.robots = { index: false, follow: false };
  }

  return metadata;
}
