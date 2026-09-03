// Primary-navigation grouping — applied at render time, in the frontend only.
//
// The nav menu is CMS/DB-driven (GET /api/menu → menu_items table) and flat:
// prisma/schema.prisma locks "Menu items are flat (no parent_id)", so a
// parent → child hierarchy cannot be expressed as menu_items records without
// a schema change. The navigation-restructure requirement is grouping only
// (no schema changes, no content/record changes), so the two parent sections
// below are layered on top of the existing flat menu by buildNavTree(): it
// nests the matching existing menu items under a dropdown-only parent and
// leaves every menu_items row — its label, URL, target and order — untouched.
// Deleting a group from this list restores the flat menu exactly.
//
// Children are matched by their already-resolved href (resolveMenuItemHref in
// lib/publicApi.js), not by stored label or id, so the grouping is stable
// regardless of how the menu item is named in the admin Menu manager. Each
// parent is a dropdown only: it has no page of its own and is never a link
// (there is no parent route to point at, and inventing one is out of scope).
export const NAV_GROUPS = [
  {
    label: "Travel",
    children: [
      { href: "/category/must-visit", label: "Must Visit" },
      { href: "/category/travel-tips", label: "Travel Tips" },
    ],
  },
  {
    label: "More About Me",
    children: [
      { href: "/books", label: "My Books" },
      { href: "/awards", label: "Mentions & Accolades" },
    ],
  },
];

// Turns the flat [{ id, label, href }] nav list into a mixed list of leaves
// and groups:
//   { type: "link", id, label, href }
//   { type: "group", label, children: [{ id, label, href }, ...] }
//
// A group takes the slot of its *first* matched child; every other matched
// child is pulled out of the flat list and moved under that group. Items that
// match no group keep their exact original position and order, and a group
// with no matched children is dropped entirely (so a missing/renamed menu
// item can never leave an empty parent behind).
export function buildNavTree(navItems, groups = NAV_GROUPS) {
  const groupForHref = new Map();
  const childConfigForHref = new Map();
  groups.forEach((group) => {
    group.children.forEach((child) => {
      groupForHref.set(child.href, group);
      childConfigForHref.set(child.href, child);
    });
  });

  const matchedByGroup = new Map(); // group -> [{ id, label, href }]
  const tree = [];

  navItems.forEach((item) => {
    const group = groupForHref.get(item.href);
    if (!group) {
      tree.push({ type: "link", id: item.id, label: item.label, href: item.href });
      return;
    }
    if (!matchedByGroup.has(group)) {
      matchedByGroup.set(group, []);
      tree.push({ type: "groupSlot", group });
    }
    const childConfig = childConfigForHref.get(item.href);
    matchedByGroup.get(group).push({
      id: item.id,
      href: item.href,
      label: childConfig?.label ?? item.label,
    });
  });

  return tree
    .map((node) => {
      if (node.type !== "groupSlot") return node;
      const matched = matchedByGroup.get(node.group) ?? [];
      // Keep the config's child order, not the order they appeared in the menu.
      const children = node.group.children
        .map((child) => matched.find((m) => m.href === child.href))
        .filter(Boolean);
      return { type: "group", label: node.group.label, children };
    })
    .filter((node) => node.type !== "group" || node.children.length > 0);
}
