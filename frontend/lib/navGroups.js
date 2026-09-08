// Assembles the public primary-navigation tree from the CMS menu data —
// GET /api/menu (menu_items table). Since the "Admin Menu ↔ nav sync" change
// the hierarchy is DB-driven, not hardcoded here:
//
//   - a menu item with parentId = null is a top-level nav entry;
//   - a menu item whose linkType is "group" is a dropdown-only parent
//     ("Travel", "More About Me") with no destination of its own;
//   - a menu item with a parentId is a dropdown entry under that group.
//
// The admin's Menu / Navigation screen is the single source of truth for
// order, labels and grouping — nothing about the visible nav is defined in
// this file any more. buildNavTree only shapes the already-ordered flat list
// the API returns into the { link | group } structure HeaderClient renders.

// Turns the flat, API-ordered nav list into a mixed list of leaves + groups:
//   { type: "link",  id, label, href }
//   { type: "group", id, label, children: [{ id, label, href }, ...] }
//
// `navItems` entries: { id, label, href, linkType, parentId }. `href` is the
// resolved URL (see resolveMenuItemHref) or null for a group / an item whose
// page/category target no longer resolves.
//
// Rules that keep the nav sane regardless of admin input:
//   - a group with no resolvable children is dropped (never an empty dropdown);
//   - a non-group top-level item with no href is dropped;
//   - a child whose href doesn't resolve is dropped from its dropdown;
//   - a child pointing at a missing/non-group parent falls back to top level
//     (matched by parentId), so it can never silently vanish.
export function buildNavTree(navItems) {
  const items = Array.isArray(navItems) ? navItems : [];

  const groupIds = new Set(items.filter((item) => item.linkType === "group").map((item) => item.id));

  const childrenByParent = new Map();
  for (const item of items) {
    if (item.parentId != null && groupIds.has(item.parentId)) {
      if (!childrenByParent.has(item.parentId)) childrenByParent.set(item.parentId, []);
      childrenByParent.get(item.parentId).push(item);
    }
  }

  const isTopLevel = (item) => item.parentId == null || !groupIds.has(item.parentId);

  return items
    .filter(isTopLevel)
    .map((item) => {
      if (item.linkType === "group") {
        const children = (childrenByParent.get(item.id) ?? [])
          .filter((child) => Boolean(child.href))
          .map((child) => ({ id: child.id, label: child.label, href: child.href }));
        return children.length > 0 ? { type: "group", id: item.id, label: item.label, children } : null;
      }
      if (!item.href) return null;
      return { type: "link", id: item.id, label: item.label, href: item.href };
    })
    .filter(Boolean);
}
