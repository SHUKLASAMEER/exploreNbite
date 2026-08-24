# Explore N Bite — Design Reference

Static HTML/CSS mockups of every page type on explorenbite.com (WordPress), built from **live computed styles** captured directly off the site — not guessed. Use this as the pixel reference while building the Next.js + Node.js rebuild. No Figma, no rate limits, no account needed — just open any `.html` file in a browser, or point Claude Code at this folder.

## Files

| File | Maps to live URL(s) |
|---|---|
| `style.css` | Shared design tokens + component styles — read this first |
| `index.html` | Homepage (`/`) — hero, sticky nav, post feed, sidebar, footer |
| `category.html` | Category archive template — reused by `/category/must-visit/`, `/category/travel-tips/...`, `/category/bites-from-corners-of-the-world/`, `/poetry-corner/`. Only the category label + post list change; sidebar drops Search/Recommended and shows only Recent Posts. |
| `about.html` | `/home/about-us/` — also the pattern for any single static page |
| `contact.html` | `/contct/` — Name / Email / Subject / Message form |
| `my-books.html` | `/my-books/` |
| `mentions-awards.html` | `/mentions-awards-and-accolades/` |
| `work-with-me.html` | `/work-with-me/` |
| `post.html` | Single blog post template (e.g. `/kids-are-not-our-property/`) — featured image, category, title, drop-cap body, share row, related posts, tags, comments |

Open `index.html` first — the black bar at the top of every page links to all 8 for quick browsing (remove that bar, it's a reference-only aid, not part of the real site).

## Design tokens (from live computed CSS)

- **Headings font:** `Playfair Display`, weight 400 (regular), serif
- **Body/UI font:** `Open Sans` — regular 400 body, 600 (SemiBold) nav links, 700 (Bold) for category labels/buttons
- **Accent gold:** `#CA9B52` — category labels, Read More button border+text, active nav link
- **Text:** black `#000000` primary, `#464646` muted (dates, footer), `#333333` widget headings
- **Borders/dividers:** `#E0E0E0`
- **Tag pill background:** `#F2F2F2`
- Body font-size 15px, line-height ~1.65; H1/H2 40px in original but hero title is much larger (~92px) — see `.hero h1.site-title` in `style.css`
- Read More button: outline only (1px solid gold), no fill, `padding: 14px 25px`, `font-size: 13px`, `letter-spacing: 2px`, uppercase, bold
- Sidebar widget headings: centered, flanked by thin horizontal rule lines (see `.widget-heading` — built with `::before`/`::after`), Playfair Display, letter-spacing 3px, uppercase
- Post body has a CSS `::first-letter` drop cap (68px, floated)

## Known gaps — things to source yourself

- **All images are gradient placeholders** labeled `IMG: filename.jpg` — I could not download the live site's actual photos into this reference (sandboxed environment, no general internet access). Pull the real images from the live site (or Sweta's own media library) when integrating.
- Google Fonts are loaded via `@import` in `style.css` for preview convenience — in Next.js, use `next/font/google` for `Playfair Display` and `Open Sans` instead of the CSS `@import`.
- Content (post titles/excerpts/dates) is copied from a handful of real posts seen during the site crawl — treat it as sample content, not the full CMS dataset.

## Suggested Next.js structure

- `components/Header.tsx` — hero (title/tagline/social icons)
- `components/NavBar.tsx` — two-row nav, `active` prop for current route, wraps responsively
- `components/PostCard.tsx` — used on home + category archive
- `components/Sidebar.tsx` — composed of `SearchWidget`, `RecommendedPostWidget`, `RecentPostsWidget`, `BadgesWidget` (props to show/hide per page, since archive pages only show Recent Posts)
- `components/Footer.tsx` — stats row + copyright bar
- `app/page.tsx` → `index.html`
- `app/category/[slug]/page.tsx` → `category.html`
- `app/about-us/page.tsx`, `app/contact/page.tsx`, `app/my-books/page.tsx`, `app/mentions-awards-and-accolades/page.tsx`, `app/work-with-me/page.tsx`
- `app/[slug]/page.tsx` (or `app/blog/[slug]/page.tsx`) → `post.html`, driven by whatever CMS/data source replaces WordPress
