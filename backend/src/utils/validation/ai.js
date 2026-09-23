const { ValidationError } = require("../errors");

// Caps mirror (or are tighter than) the Post model's own column limits
// (utils/validation/posts.js) — this is about keeping the eventual AI
// request small and bounded, not re-validating the post itself. Content is
// capped hard: "Respect reasonable input limits. Do not send unlimited HTML
// or huge payloads" (task Section 5).
const TITLE_MAX = 200;
const SHORT_DESCRIPTION_MAX = 300;
const SLUG_MAX = 220;
const CATEGORY_MAX = 100;
const TAG_MAX = 80;
const TAGS_MAX_COUNT = 20;
const CONTENT_HTML_MAX = 20000; // raw HTML chars, before stripping
const CONTENT_TEXT_MAX = 6000; // plain-text chars actually sent to a provider

function stripHtml(html) {
  return String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses + normalizes the request body for POST /api/admin/ai/seo-suggestions
 * into the plain-text fields an AI prompt would use. Only what SEO analysis
 * needs (task Section 5) — no admin credentials, cookies, or unrelated
 * records ever reach this, since this only ever reads req.body.
 */
function parseSeoSuggestionInput(body) {
  const input = body && typeof body === "object" ? body : {};

  const title = typeof input.title === "string" ? input.title.trim().slice(0, TITLE_MAX) : "";
  if (!title) {
    throw new ValidationError("A post title is required to generate SEO suggestions.");
  }

  const shortDescription =
    typeof input.shortDescription === "string" ? input.shortDescription.trim().slice(0, SHORT_DESCRIPTION_MAX) : "";

  const rawContent = typeof input.content === "string" ? input.content : "";
  if (!rawContent.trim()) {
    throw new ValidationError("Post content is required to generate SEO suggestions.");
  }
  if (rawContent.length > CONTENT_HTML_MAX) {
    throw new ValidationError(`Content is too large to analyze (max ${CONTENT_HTML_MAX} characters).`);
  }
  const content = stripHtml(rawContent).slice(0, CONTENT_TEXT_MAX);
  if (!content) {
    throw new ValidationError("Post content is required to generate SEO suggestions.");
  }

  const category = typeof input.category === "string" ? input.category.trim().slice(0, CATEGORY_MAX) : "";

  const rawTags = Array.isArray(input.tags) ? input.tags : [];
  const tags = rawTags
    .filter((t) => typeof t === "string")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, TAGS_MAX_COUNT)
    .map((t) => t.slice(0, TAG_MAX));

  const slug = typeof input.slug === "string" ? input.slug.trim().slice(0, SLUG_MAX) : "";

  return { title, shortDescription, content, category, tags, slug };
}

module.exports = { parseSeoSuggestionInput, stripHtml };
