import { SITE_NAME, SITE_URL, absoluteUrl } from "./siteConfig";
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
    // Publisher logo for JSON-LD (Settings.logoUrl — the same admin-managed
    // value the header renders). null when unset, so builders omit it rather
    // than fabricate a URL.
    logoUrl: settings?.logoUrl?.trim() || null,
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

// ===========================================================================
// JSON-LD structured data (Schema.org)
// ===========================================================================
// Builders return plain objects; <components/JsonLd> serialises them into a
// <script type="application/ld+json"> tag. Only real CMS data is used — a
// missing optional field is omitted, never guessed. "@context"/"@type" and
// the property names are technical schema constants and stay code-defined.
//
// There is deliberately NO Recipe builder: the schema has no structured
// recipe data (no ingredients / instructions / prep-cook time / yield), and
// deriving them from freeform post HTML would be fabrication. See the SEO
// task report — Recipe schema is pending a real recipe model.

// Serialise for embedding in <script> via dangerouslySetInnerHTML. JSON
// already escapes quotes/backslashes; escaping "<" additionally makes a value
// containing "</script>", "<!--" or "<script" impossible to break out with.
export function jsonLdScript(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// Absolute canonical URL for a site-relative path (never localhost in prod —
// SITE_URL is NEXT_PUBLIC_SITE_URL, see siteConfig.js).
function abs(path) {
  return absoluteUrl(path);
}

// Shared publisher node. `logo` only when Settings.logoUrl is set.
function publisherNode({ siteName, logoUrl }) {
  const org = { "@type": "Organization", name: siteName || SITE_NAME, url: SITE_URL || abs("/") };
  if (logoUrl) org.logo = { "@type": "ImageObject", url: abs(logoUrl) };
  return org;
}

// Home page: WebSite identity + a SearchAction pointing at the real
// /search?q= endpoint (Sitelinks Search Box). The urlTemplate must keep the
// literal {search_term_string} token, so it is built by string concat rather
// than through new URL() (which would percent-encode the braces).
export function buildWebSiteJsonLd({ siteName, description, logoUrl } = {}) {
  const base = SITE_URL || abs("/").replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName || SITE_NAME,
    url: base + "/",
    ...(description ? { description } : {}),
    publisher: publisherNode({ siteName, logoUrl }),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// Individual published post. `post` is the public post shape from
// getPublicPostBySlug (id/title/slug/shortDescription/featuredImageUrl/
// publishDate/updatedAt/author{id,name,photoUrl}/category{name,slug}/tags[]).
export function buildBlogPostingJsonLd({ post, siteName, logoUrl } = {}) {
  if (!post?.slug || !post?.title) return null;
  const url = abs(`/posts/${post.slug}`);
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    publisher: publisherNode({ siteName, logoUrl }),
  };
  if (post.shortDescription) data.description = post.shortDescription;
  if (post.featuredImageUrl) data.image = [abs(post.featuredImageUrl)];
  if (post.publishDate) data.datePublished = new Date(post.publishDate).toISOString();
  const modified = post.updatedAt || post.publishDate;
  if (modified) data.dateModified = new Date(modified).toISOString();
  if (post.author?.name) {
    data.author = {
      "@type": "Person",
      name: post.author.name,
      ...(post.author.id ? { url: abs(`/authors/${post.author.id}`) } : {}),
      ...(post.author.photoUrl ? { image: abs(post.author.photoUrl) } : {}),
    };
  }
  if (post.category?.name) data.articleSection = post.category.name;
  const keywords = (post.tags || []).map((t) => t?.name).filter(Boolean);
  if (keywords.length) data.keywords = keywords.join(", ");
  return data;
}

// Breadcrumb trail. `crumbs`: [{ name, path }] — path site-relative. Returns
// null for a trail shorter than 2 (a single level isn't a meaningful
// hierarchy). Never mirrors the nav; it's the page's own ancestry.
export function buildBreadcrumbJsonLd(crumbs = []) {
  const items = (crumbs || []).filter((c) => c && c.name && c.path);
  if (items.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}

// Category archive / any listing page.
export function buildCollectionPageJsonLd({ name, description, path } = {}) {
  if (!name || !path) return null;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: abs(path),
    ...(description ? { description } : {}),
  };
}

// /books — an ItemList of Book entities from the Book CMS model
// (title/coverImageUrl/description/publishedYear/buyLinks[]).
export function buildBookListJsonLd({ books, path } = {}) {
  const list = (books || []).filter((b) => b && b.title);
  if (!list.length || !path) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    url: abs(path),
    itemListElement: list.map((b, i) => {
      const book = { "@type": "Book", name: b.title };
      if (b.description) book.description = b.description;
      if (b.coverImageUrl) book.image = abs(b.coverImageUrl);
      if (b.publishedYear) book.datePublished = String(b.publishedYear);
      const sameAs = (b.buyLinks || []).map((l) => l?.url).filter(Boolean);
      if (sameAs.length) book.sameAs = sameAs;
      return { "@type": "ListItem", position: i + 1, item: book };
    }),
  };
}
