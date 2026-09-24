// Sidebar widget REGISTRY — code-owned, not editable from the admin panel.
//
// This is the "fixed supported widget registry" half of the sidebar
// configuration: it defines which widget keys exist, a human label for the
// admin UI, and whether a widget belongs to the sticky badge block. What each
// widget actually renders / fetches lives in the frontend components
// (components/public/*Widget.js) — this file is only the shared vocabulary
// plus the seed defaults.
//
// The database (SidebarWidgetSetting) stores only per-(layout, widget)
// visibility + order. See prisma/schema.prisma.

// The sidebar layouts the public site renders (frontend Sidebar.js `layout`
// prop). Fixed in code — adding a layout means adding a page that uses it.
const LAYOUT_KEYS = ["home", "archive", "post", "page", "contact", "utility"];

// Every supported widget. `label` is shown in the admin Sidebar screen.
// `sticky: true` widgets are pulled into the single sticky badge block at the
// bottom of the sidebar (unchanged behavior — Tripoto / IndiBlogger / Sur.ly).
const WIDGETS = [
  { key: "search", label: "Search" },
  { key: "recommended", label: "Recommended post" },
  { key: "recentPosts", label: "Recent Posts" },
  { key: "facebook", label: "Facebook" },
  { key: "subscribe", label: "Subscribe" },
  { key: "twitter", label: "Twitter" },
  { key: "award", label: "Award photo / heading" },
  { key: "tripoto", label: "Tripoto badge", sticky: true },
  { key: "indiblogger", label: "IndiBlogger badge", sticky: true },
  { key: "surly", label: "Sur.ly badge", sticky: true },
];

const WIDGET_KEYS = WIDGETS.map((w) => w.key);
const STICKY_KEYS = WIDGETS.filter((w) => w.sticky).map((w) => w.key);

// Seed source (prisma/seed.js) for fresh databases; the frontend keeps a
// matching fallback in components/public/Sidebar.js. "home" is the one full
// blog sidebar, used by home, category, post, search and author pages, in
// the canonical order. "page" and "contact" are the compact variants.
// "archive", "post" and "utility" are no longer rendered by any route; their
// seeds are kept as they were.
const DEFAULT_LAYOUTS = {
  home: [
    "search",
    "recommended",
    "recentPosts",
    "subscribe",
    "facebook",
    "twitter",
    "award",
    "tripoto",
    "indiblogger",
    "surly",
  ],
  archive: [
    "recentPosts",
    "search",
    "recommended",
    "facebook",
    "subscribe",
    "twitter",
    "award",
    "tripoto",
    "indiblogger",
    "surly",
  ],
  post: ["recentPosts", "search"],
  page: ["recommended", "recentPosts"],
  contact: ["search", "recommended", "recentPosts"],
  utility: ["search", "recommended", "recentPosts"],
};

// [{ layout, widgetKey, enabled, sortOrder }] for every pair in
// DEFAULT_LAYOUTS — used to seed SidebarWidgetSetting.
function defaultRows() {
  const rows = [];
  for (const layout of LAYOUT_KEYS) {
    (DEFAULT_LAYOUTS[layout] ?? []).forEach((widgetKey, index) => {
      rows.push({ layout, widgetKey, enabled: true, sortOrder: index });
    });
  }
  return rows;
}

module.exports = {
  LAYOUT_KEYS,
  WIDGETS,
  WIDGET_KEYS,
  STICKY_KEYS,
  DEFAULT_LAYOUTS,
  defaultRows,
};
