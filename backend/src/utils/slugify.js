// Ported from the Next.js app's lib/validation/categories.js (it was
// defined there and re-exported by posts.js/pages.js). Now a standalone
// utility since every validation module needs it equally.
//
// "Travel Tips" -> "travel-tips". Lowercases, strips punctuation, collapses
// whitespace/repeated separators into single hyphens, trims leading/
// trailing hyphens. Deliberately ASCII-only (no accent transliteration) —
// every existing category/post/page name is plain English, so this isn't
// needed yet.
function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = { slugify };
