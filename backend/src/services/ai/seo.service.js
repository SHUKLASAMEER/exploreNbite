const provider = require("./provider");
const { parseSeoSuggestionInput } = require("../../utils/validation/ai");
const { AiResponseError } = require("../../utils/errors");

const SEO_TITLE_MAX = 70;
const META_DESCRIPTION_MAX = 160;
const KEYWORDS_MIN = 3;
const KEYWORDS_MAX = 8;
const SUGGESTIONS_MAX = 6;

/**
 * Builds the SEO-analysis prompt from already-validated post data. Kept as
 * a pure function (no I/O) so it's independently reviewable/testable.
 *
 * Ground rules baked into the system prompt (task Section 7): use only the
 * supplied content, never invent facts/stats/locations/awards/credentials/
 * dates, preserve the author's intent, avoid keyword stuffing and clickbait,
 * and never claim to have verified anything externally.
 */
function buildSeoPrompt({ title, shortDescription, content, category, tags, slug }) {
  const system = [
    "You are an SEO assistant for a food/travel blog's admin post editor.",
    "You analyze ONE draft post and suggest SEO metadata. You do not invent facts.",
    "",
    "Rules:",
    "- Use ONLY the post data provided below. Never invent statistics, locations, awards, credentials, or dates that are not present in the content.",
    "- Never claim to have verified anything externally — you only read the text given.",
    "- Preserve the author's intent and the article's factual meaning.",
    "- Prefer natural SEO language over keyword stuffing.",
    "- Avoid clickbait phrasing unless the content genuinely supports the claim.",
    "- Suggestions are recommendations for a human editor to review, not instructions to rewrite the article.",
    "",
    `Respond with ONLY a single JSON object matching exactly this shape (no markdown, no commentary):`,
    "{",
    `  "seoTitle": string (<= ${SEO_TITLE_MAX} characters),`,
    `  "metaDescription": string (<= ${META_DESCRIPTION_MAX} characters),`,
    `  "focusKeywords": string[] (${KEYWORDS_MIN}-${KEYWORDS_MAX} short phrases),`,
    `  "excerpt": string (a short SEO-friendly summary),`,
    `  "suggestions": string[] (up to ${SUGGESTIONS_MAX} short content/heading improvement notes)`,
    "}",
  ].join("\n");

  const user = [
    `Title: ${title}`,
    shortDescription ? `Current short description: ${shortDescription}` : null,
    category ? `Category: ${category}` : null,
    tags?.length ? `Tags: ${tags.join(", ")}` : null,
    slug ? `Slug: ${slug}` : null,
    "",
    "Content (plain text, HTML stripped):",
    content,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { system, user };
}

function isNonEmptyString(v, max) {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}

function isStringArray(v, min, max, itemMax) {
  if (!Array.isArray(v) || v.length < min || v.length > max) return false;
  return v.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= itemMax);
}

/**
 * Validates a parsed provider response against the required output
 * contract (task Section 6). Throws AiResponseError — never applied, never
 * exposed to the client as-is — on anything malformed. This is the
 * boundary that keeps arbitrary free-form model output out of the app.
 */
function validateSeoSuggestionResponse(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AiResponseError();
  }
  if (!isNonEmptyString(parsed.seoTitle, SEO_TITLE_MAX * 2)) {
    throw new AiResponseError();
  }
  if (!isNonEmptyString(parsed.metaDescription, META_DESCRIPTION_MAX * 2)) {
    throw new AiResponseError();
  }
  if (!isStringArray(parsed.focusKeywords, KEYWORDS_MIN, KEYWORDS_MAX, 80)) {
    throw new AiResponseError();
  }
  if (!isNonEmptyString(parsed.excerpt, META_DESCRIPTION_MAX * 3)) {
    throw new AiResponseError();
  }
  if (parsed.suggestions !== undefined && !isStringArray(parsed.suggestions, 0, SUGGESTIONS_MAX, 300)) {
    throw new AiResponseError();
  }

  return {
    seoTitle: parsed.seoTitle.trim(),
    metaDescription: parsed.metaDescription.trim(),
    focusKeywords: parsed.focusKeywords.map((k) => k.trim()),
    excerpt: parsed.excerpt.trim(),
    suggestions: (parsed.suggestions ?? []).map((s) => s.trim()),
  };
}

/**
 * Full request flow: validate input -> build prompt -> call provider ->
 * parse + validate structured output. Never persists anything and never
 * touches the Post table — this is a pure suggestion generator (task
 * Section 12/13: applying a suggestion is an editor-only, client-side
 * action; only the existing Save/autosave paths write to the database).
 */
async function generateSeoSuggestions(rawInput) {
  const input = parseSeoSuggestionInput(rawInput);
  const prompt = buildSeoPrompt(input);

  // Throws AiUnavailableError today (no provider configured) — this is the
  // expected/honest outcome for every request until a provider is wired.
  const rawText = await provider.callProvider(prompt);

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new AiResponseError();
  }

  return validateSeoSuggestionResponse(parsed);
}

module.exports = { buildSeoPrompt, validateSeoSuggestionResponse, generateSeoSuggestions };
