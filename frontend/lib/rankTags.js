// Deterministic, client-side relevance ranking for the post editor's
// existing-tag suggestions.
//
// It never touches the network, never creates or edits tags, and never
// changes tag data — it only reorders the tags the tags API already
// returned so that the ones related to what the admin has typed (post
// title / short description / content) surface first. With no context to
// rank against it returns the list in its original order, unchanged.

import { htmlToPlainText } from "./text";

// Common English function words that shouldn't lend a tag any real
// relevance if they happen to appear in the post text. Exported so the
// new-tag candidate generator uses exactly the same list.
export const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "at", "for",
  "with", "by", "from", "as", "is", "are", "was", "were", "be", "been",
  "being", "it", "its", "this", "that", "these", "those", "then", "than",
  "so", "if", "we", "you", "your", "our", "us", "i", "my", "me", "he", "she",
  "they", "them", "his", "her", "their", "not", "no", "do", "does", "did",
  "has", "have", "had", "will", "would", "can", "could", "should", "may",
  "might", "about", "into", "over", "under", "up", "down", "out", "off",
  "all", "any", "some", "more", "most", "other", "such", "only", "own",
  "same", "each", "via", "per",
]);

// lowercase; every run of non-alphanumeric characters (punctuation, dashes,
// slashes, …) collapses to one space; trim. Unicode letters/numbers are
// kept as-is so non-Latin tag names still match themselves.
function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Client-side mirror of the backend's slugify() (backend/src/utils/slugify.js)
// — used only as a stable case/whitespace-insensitive key for comparing tag
// names locally. The backend slug is always the source of truth.
export function tagSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// whole-word / whole-phrase test: the needle must sit on a space or a
// string boundary inside the haystack (which is already space-padded).
function hasWholePhrase(paddedHaystack, needle) {
  return needle.length > 0 && paddedHaystack.includes(` ${needle} `);
}

function hasSubstring(haystack, needle) {
  return needle.length > 0 && haystack.includes(needle);
}

// Per-field weights. Title matches count for far more than content matches,
// and a whole-word/phrase hit always beats a substring-only hit.
const FIELD_WEIGHTS = {
  title: { phraseWhole: 100, phraseSub: 55, wordWhole: 12, wordSub: 5 },
  description: { phraseWhole: 45, phraseSub: 25, wordWhole: 6, wordSub: 3 },
  content: { phraseWhole: 25, phraseSub: 12, wordWhole: 4, wordSub: 2 },
};

function scoreAgainstField(tagPhrase, tagWords, fieldText, weights) {
  if (!fieldText) return 0;
  const padded = ` ${fieldText} `;
  let score = 0;

  if (hasWholePhrase(padded, tagPhrase)) {
    score += weights.phraseWhole;
  } else if (hasSubstring(fieldText, tagPhrase)) {
    score += weights.phraseSub;
  }

  // Individual words only matter for multi-word tags — a single-word tag is
  // already fully covered by the phrase check above.
  if (tagWords.length > 1) {
    for (const word of tagWords) {
      if (hasWholePhrase(padded, word)) {
        score += weights.wordWhole;
      } else if (hasSubstring(fieldText, word)) {
        score += weights.wordSub;
      }
    }
  }

  return score;
}

// Score one tag against an already-normalized context object.
export function scoreTag(tag, context) {
  const tagPhrase = normalize(tag && tag.name);
  if (!tagPhrase) return 0;

  const tagWords = tagPhrase
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));

  // A tag that is nothing but stop words / single letters contributes
  // nothing, so it falls back to its original ordering position.
  if (tagWords.length === 0) return 0;

  return (
    scoreAgainstField(tagPhrase, tagWords, context.title, FIELD_WEIGHTS.title) +
    scoreAgainstField(tagPhrase, tagWords, context.description, FIELD_WEIGHTS.description) +
    scoreAgainstField(tagPhrase, tagWords, context.content, FIELD_WEIGHTS.content)
  );
}

// Build the normalized, reusable context from the raw PostForm fields.
// `content` is HTML source, so it's flattened to plain text first — the
// original HTML value is never mutated.
export function buildTagContext({ title, description, content } = {}) {
  return {
    title: normalize(title),
    description: normalize(description),
    content: normalize(htmlToPlainText(content)),
  };
}

// Returns a NEW array. Original order is the tie-breaker between equal
// scores and the complete result when there's no context to rank against.
export function rankTags(tags, context) {
  const list = Array.isArray(tags) ? tags : [];
  const ctx = context || { title: "", description: "", content: "" };

  const hasContext = Boolean(ctx.title || ctx.description || ctx.content);
  if (!hasContext) return list.slice();

  return list
    .map((tag, index) => ({ tag, index, score: scoreTag(tag, ctx) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.tag);
}
