// Primary-navigation order + grouping — applied at render time, in the
// frontend only.
//
// The nav menu is CMS/DB-driven (GET /api/menu → menu_items table) and flat:
// prisma/schema.prisma locks "Menu items are flat (no parent_id)", and each
// row's own sortOrder is admin-editable data, not a hierarchy. The required
// public nav is a fixed order (Home, Travel, Bites…, More About Me, Work
// With Me, About Us, Contact) that does not match menu_items.sortOrder and
// pulls one further-down item ("Poetry Corner") into a dropdown between two
// other top-level items — neither a schema change nor reordering the DB rows
// themselves is needed (or wanted — the menu_items table is left completely
// untouched) to get there. NAV_LAYOUT below is the single source of truth
// for the *visible* order and grouping; buildNavTree() slots each existing
// menu item (matched by its already-resolved href, not by stored label or
// id — stable regardless of how an item is named in the admin Menu manager)
// into that layout. A menu item that doesn't appear in NAV_LAYOUT still
// renders — appended at the end, in its normal menu order — so nothing an
// admin adds later silently disappears from the public nav.
//
// Each group is a dropdown only: it has no page of its own and is never a
// link (there is no parent route to point at, and inventing one is out of
// scope).
const NAV_LAYOUT = [
  { type: "link", href: "/category/home" },
  {
    type: "group",
    label: "Travel",
    children: [
      { href: "/category/must-visit", label: "Must Visit" },
      { href: "/category/travel-tips", label: "Travel Tips" },
    ],
  },
  { type: "link", href: "/category/bites-from-corners-of-the-world" },
  {
    type: "group",
    label: "More About Me",
    children: [
      { href: "/books", label: "My Books" },
      { href: "/awards", label: "Mentions & Accolades" },
      { href: "/category/poetry-corner", label: "Poetry Corner" },
    ],
  },
  { type: "link", href: "/pages/work-with-me" },
  { type: "link", href: "/pages/about-us" },
  { type: "link", href: "/pages/contact" },
];

// Turns the flat [{ id, label, href }] nav list into a mixed list of leaves
// and groups, in NAV_LAYOUT's exact order:
//   { type: "link", id, label, href }
//   { type: "group", label, children: [{ id, label, href }, ...] }
//
// Plain links keep the menu item's own stored label (never overridden, so an
// admin's exact wording/casing for "Bites from corners of the world",
// "Work with me", "About us", "Contact" etc. is preserved) — only dropdown
// child labels are normalized to the exact required text. A group with zero
// matched children is dropped entirely, and a layout slot whose menu item
// doesn't currently exist is skipped — a missing/renamed menu item can never
// produce a blank slot or an empty parent.
export function buildNavTree(navItems, layout = NAV_LAYOUT) {
  const byHref = new Map(navItems.map((item) => [item.href, item]));
  const consumed = new Set();

  const tree = layout
    .map((slot) => {
      if (slot.type === "link") {
        const item = byHref.get(slot.href);
        if (!item) return null;
        consumed.add(slot.href);
        return { type: "link", id: item.id, label: item.label, href: item.href };
      }

      const children = slot.children
        .map((child) => {
          const item = byHref.get(child.href);
          if (!item) return null;
          consumed.add(child.href);
          return { id: item.id, href: item.href, label: child.label };
        })
        .filter(Boolean);

      return children.length > 0 ? { type: "group", label: slot.label, children } : null;
    })
    .filter(Boolean);

  const leftover = navItems
    .filter((item) => !consumed.has(item.href))
    .map((item) => ({ type: "link", id: item.id, label: item.label, href: item.href }));

  return [...tree, ...leftover];
}
