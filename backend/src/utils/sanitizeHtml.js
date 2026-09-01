// Targeted HTML hardening for admin-authored rich text (Post.content /
// Page.content) applied at the write boundary in the post/page services.
//
// SCOPE — read before changing:
// This is NOT a full HTML sanitizer/parser. It is a conservative denylist
// strip of the specific constructs that let stored content run script in a
// visitor's browser. It deliberately keeps all ordinary formatting,
// images, links, tables, figures and captions untouched so recovered
// WordPress content renders exactly as authored. A proper allowlist
// sanitizer (e.g. the `sanitize-html` package) is the recommended
// follow-up; it was not added here to avoid an un-reviewed dependency in
// this phase.
//
// What it removes:
//   - <script>, <style>, <object>, <embed>, <applet>, <form>, <base>,
//     <meta>, <link> elements (tags + their contents where relevant)
//   - every on*="" / on*='' event-handler attribute on any tag
//   - href/src/action/xlink:href/formaction values using the
//     javascript:, vbscript: or data: schemes (data:image/* in src is kept)
//   - <iframe> whose src host is not on EMBED_ALLOWED_HOSTS (YouTube, Vimeo,
//     Google Maps, OpenStreetMap, Instagram, Spotify, SoundCloud). An
//     allowed iframe is kept as-is.

const EMBED_ALLOWED_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "player.vimeo.com",
  "www.google.com", // /maps embeds
  "maps.google.com",
  "www.openstreetmap.org",
  "www.instagram.com",
  "instagram.com",
  "open.spotify.com",
  "w.soundcloud.com",
];

function stripElement(html, tag) {
  // remove <tag ...>...</tag> (greedy-safe, case-insensitive, multiline)
  const paired = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, "gi");
  // remove any leftover/self-closing/orphan <tag ...> or </tag>
  const single = new RegExp(`</?${tag}\\b[^>]*>`, "gi");
  return html.replace(paired, "").replace(single, "");
}

function stripEventHandlers(html) {
  // on<word>= "..." | '...' | bareword  — inside any tag
  return html.replace(/\son[a-z0-9_-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function neutralizeDangerousUris(html) {
  return html.replace(
    /\s(href|src|action|formaction|xlink:href)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (match, attr, _q, dq, sq, bare) => {
      const value = (dq ?? sq ?? bare ?? "").trim();
      const scheme = value.slice(0, 20).toLowerCase().replace(/\s+/g, "");
      const isImgData = /^data:image\//i.test(value);
      if (
        (scheme.startsWith("javascript:") ||
          scheme.startsWith("vbscript:") ||
          (scheme.startsWith("data:") && !isImgData))
      ) {
        return ` ${attr}="#"`;
      }
      return match;
    }
  );
}

function filterIframes(html) {
  return html.replace(/<iframe\b[^>]*>(?:[\s\S]*?<\/iframe\s*>)?/gi, (tag) => {
    const srcMatch = tag.match(/\ssrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const src = (srcMatch && (srcMatch[2] ?? srcMatch[3] ?? srcMatch[4])) || "";
    let host = "";
    try {
      host = new URL(src, "https://x").host.toLowerCase();
    } catch {
      host = "";
    }
    return EMBED_ALLOWED_HOSTS.includes(host) ? tag : "";
  });
}

function sanitizeContentHtml(html) {
  if (typeof html !== "string" || html === "") return html;
  let out = html;
  for (const tag of ["script", "style", "object", "embed", "applet", "form", "base", "meta", "link"]) {
    out = stripElement(out, tag);
  }
  out = stripEventHandlers(out);
  out = neutralizeDangerousUris(out);
  out = filterIframes(out);
  return out;
}

module.exports = { sanitizeContentHtml, EMBED_ALLOWED_HOSTS };
