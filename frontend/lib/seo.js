import { SITE_NAME, absoluteUrl } from "./siteConfig";
import { getPublicSettings } from "./publicApi";

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
// Hard fallback only — the real site-wide default meta description is
// admin-editable (Settings.metaDescription) and read via getSeoDefaults().
const DEFAULT_DESCRIPTION = "Offbeat travel stories and food, one bite at a time — by Sweta Papaiyawala.";

// The admin-managed SEO defaults, for use inside an async generateMetadata().
// `description` and `ogImage` come from Settings; `siteName` from Settings too
// so the "%s | <site>" title template and og:site_name follow the CMS. All
// three degrade to the code fallbacks if Settings can't be loaded.
export async function getSeoDefaults() {
  const { settings } = await getPublicSettings();
  return {
    siteName: settings?.siteTitle?.trim() || SITE_NAME,
    tagline: settings?.tagline?.trim() || null,
    description: settings?.metaDescription?.trim() || DEFAULT_DESCRIPTION,
    ogImage: settings?.defaultOgImageUrl?.trim() || null,
  };
}

export function buildMetadata({
  path = "/",
  title,
  description,
  image,
  defaultImage,
  siteName = SITE_NAME,
  type = "website",
  noindex = false,
  publishedTime,
  modifiedTime,
  authors,
} = {}) {
  const canonical = absoluteUrl(path);
  const desc = (description && String(description).trim()) || DEFAULT_DESCRIPTION;
  // Per-page `image` wins; otherwise fall back to the site-wide default OG
  // image (Settings.defaultOgImageUrl, passed in by an async caller).
  const ogImage = image || defaultImage || null;
  const ogImages = ogImage ? [{ url: absoluteUrl(ogImage) }] : undefined;
  // `title` may be a plain string (gets the "| Explore N Bite" template
  // applied by the root layout) or { absolute: "…" } to opt out of it.
  const titleText = typeof title === "string" ? title : title?.absolute || siteName;

  const metadata = {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      type,
      url: canonical,
      siteName,
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
      card: ogImage ? "summary_large_image" : "summary",
      title: titleText,
      description: desc,
      images: ogImage ? [absoluteUrl(ogImage)] : undefined,
    },
  };

  if (noindex) {
    metadata.robots = { index: false, follow: false };
  }

  return metadata;
}
