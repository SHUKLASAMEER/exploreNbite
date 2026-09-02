// Plain-text excerpt from an HTML string — used only to derive a meta
// description when a content item has no dedicated excerpt field. Not a
// sanitizer and never rendered as HTML; it just strips tags and collapses
// whitespace, then trims to `max` characters on a word boundary.
export function stripHtmlToText(html, max = 160) {
  if (!html) return "";
  const text = String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, text.lastIndexOf(" ", max) > 0 ? text.lastIndexOf(" ", max) : max).trim() + "…";
}
