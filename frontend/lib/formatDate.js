// Shared date formatting for the public site — "November 22, 2019", matching
// the live site's post-date format. One place so PostCard, single-post
// meta, comments, and the awards grid all render dates identically.
export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
