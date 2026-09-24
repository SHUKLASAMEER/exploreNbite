import { SITE_NAME, SITE_URL, absoluteUrl } from "./siteConfig";
import { getPublicSettings } from "./publicApi";
import { htmlToPlainText } from "./text";

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

// Search-result length budgets (QA-012).
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

// Last-resort share image: the bundled hero photo — the same asset
// Header.js falls back to when Settings.heroImageUrl is blank. Only used when
// neither Settings.defaultOgImageUrl nor Settings.heroImageUrl is set.
const FALLBACK_OG_IMAGE = "/hero-bhadkeshwar-mahadev.jpg";

// Cut `text` to at most `max` characters on a word boundary, ending in "…".
function truncateAtWord(text, max) {
  const t = String(text).trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return base.replace(/[\s,;:.\-—–|]+$/, "") + "…";
}

// <title> within TITLE_MAX. The root layout's template appends
// " | <siteName>" to plain-string titles, so a title keeps that suffix only
// when the whole thing fits; otherwise the page title stands alone
// ({ absolute }), truncated on a word boundary if it is still too long.
export function fitTitle(title, siteName = SITE_NAME) {
  if (title && typeof title === "object") {
    return { absolute: truncateAtWord(title.absolute || siteName, TITLE_MAX) };
  }
  const text = String(title || "").trim();
  if (!text) return { absolute: truncateAtWord(siteName, TITLE_MAX) };
  if (text.length + ` | ${siteName}`.length <= TITLE_MAX) return text;
  return { absolute: truncateAtWord(text, TITLE_MAX) };
}

// Meta description within DESC_MIN–DESC_MAX. `candidates` are real sources in
// priority order (plain text or HTML). The first one that is long enough is
// used, cut to DESC_MAX on a word boundary. If every source is short, the
// first short one is followed by the site-wide description, so nothing is
// padded with invented text.
export function fitDescription(candidates, fallback = DEFAULT_DESCRIPTION) {
  const list = (Array.isArray(candidates) ? candidates : [candidates])
    .map((c) => (c ? htmlToPlainText(c) : ""))
    .filter(Boolean);
  const long = list.find((c) => c.length >= DESC_MIN);
  if (long) return truncateAtWord(long, DESC_MAX);
  const site = String(fallback || "").trim() || DEFAULT_DESCRIPTION;
  const base = site.length >= DESC_MIN ? site : `${site} ${DEFAULT_DESCRIPTION}`;
  const short = list[0];
  if (short && short !== site) {
    return truncateAtWord(`${short.replace(/[\s.…]+$/, "")}. ${base}`, DESC_MAX);
  }
  return truncateAtWord(base, DESC_MAX);
}

// First site-hosted <img src> in a post's HTML body — the share-image
// fallback for posts without a featured image. Only images this site serves
// (site-relative, e.g. /uploads/…); hot-linked third-party images are
// skipped. The attribute value is HTML-escaped, so `&amp;` is decoded.
export function firstContentImage(html) {
  if (!html) return null;
  for (const m of String(html).matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    const src = m[1].trim().replace(/&amp;/g, "&");
    if (src.startsWith("/") && !src.startsWith("//")) return src;
  }
  return null;
}

// The admin-managed SEO defaults, for use inside an async generateMetadata().
// `description` and `ogImage` come from Settings; `siteName` from Settings too
// so the "%s | <site>" title template and og:site_name follow the CMS. All
// three degrade to the code fallbacks if Settings can't be loaded. The share
// image falls back from Settings.defaultOgImageUrl to the site's hero image.
export async function getSeoDefaults() {
  const { settings } = await getPublicSettings();
  return {
    siteName: settings?.siteTitle?.trim() || SITE_NAME,
    tagline: settings?.tagline?.trim() || null,
    description: settings?.metaDescription?.trim() || DEFAULT_DESCRIPTION,
    ogImage: settings?.defaultOgImageUrl?.trim() || settings?.heroImageUrl?.trim() || FALLBACK_OG_IMAGE,
    // Publisher logo for JSON-LD (Settings.logoUrl — the same admin-managed
    // value the header renders). null when unset, so builders omit it rather
    // than fabricate a URL.
    logoUrl: settings?.logoUrl?.trim() || null,
  };
}

// - `description` string, or an array of real sources in priority order
// - `fallbackDescription` the site-wide description (Settings.metaDescription)
// - `image`      one URL, or an array of candidates in priority order
// - `imageAlt`   og:image:alt / twitter image alt (defaults to the title)
export function buildMetadata({
  path = "/",
  title,
  description,
  fallbackDescription,
  image,
  imageAlt,
  defaultImage,
  siteName = SITE_NAME,
  type = "website",
  noindex = false,
  publishedTime,
  modifiedTime,
  authors,
} = {}) {
  // One URL for both <link rel=canonical> and og:url (QA-028).
  const canonical = absoluteUrl(path);
  const desc = fitDescription(description, fallbackDescription);
  // Share image: the first per-page candidate, then the site-wide default
  // (Settings.defaultOgImageUrl → hero image, via getSeoDefaults), then the
  // bundled hero. og:image and twitter:image always use the same URL.
  const candidates = Array.isArray(image) ? image : [image];
  const ogImage = candidates.find(Boolean) || defaultImage || FALLBACK_OG_IMAGE;
  // `title` may be a plain string (gets the "| Explore N Bite" template
  // applied by the root layout) or { absolute: "…" } to opt out of it;
  // either way it is fitted to TITLE_MAX.
  const fittedTitle = fitTitle(title, siteName);
  const titleText = typeof fittedTitle === "string" ? fittedTitle : fittedTitle.absolute;
  const alt = (imageAlt && String(imageAlt).trim()) || titleText;
  const ogImages = [{ url: absoluteUrl(ogImage), alt }];

  const metadata = {
    title: fittedTitle,
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
      card: "summary_large_image",
      title: titleText,
      description: desc,
      images: [{ url: absoluteUrl(ogImage), alt }],
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
// `image` is the page's resolved share image, so BlogPosting and og:image
// agree when a post has no featured image.
export function buildBlogPostingJsonLd({ post, siteName, logoUrl, image } = {}) {
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
  const articleImage = post.featuredImageUrl || image;
  if (articleImage) data.image = [abs(articleImage)];
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
