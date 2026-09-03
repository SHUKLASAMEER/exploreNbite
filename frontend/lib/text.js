// Full plain-text form of an HTML string: strips tags, decodes the handful
// of entities that actually show up in imported content, collapses
// whitespace. Not a sanitizer and never rendered as HTML. No truncation —
// callers that want an excerpt add their own (see stripHtmlToText).
export function htmlToPlainText(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Plain-text excerpt from an HTML string — used only to derive a meta
// description when a content item has no dedicated excerpt field. Not a
// sanitizer and never rendered as HTML; it just strips tags and collapses
// whitespace, then trims to `max` characters on a word boundary.
export function stripHtmlToText(html, max = 160) {
  const text = htmlToPlainText(html);
  if (text.length <= max) return text;
  return text.slice(0, text.lastIndexOf(" ", max) > 0 ? text.lastIndexOf(" ", max) : max).trim() + "…";
}
