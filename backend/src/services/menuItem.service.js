const { prisma } = require("../config/prisma");
const { parseMenuItemInput } = require("../utils/validation/menuItems");
const { NotFoundError, ValidationError } = require("../utils/errors");

// Every list/detail/create/update response resolves the linked page/category
// so the frontend never has to cross-reference ids itself — same "include
// what the UI needs" approach as Media's uploader include.
const TARGET_INCLUDE = {
  page: { select: { id: true, title: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  parent: { select: { id: true, label: true } },
};

async function list() {
  // One flat, globally-ordered list. The public nav (frontend
  // lib/navGroups.js) and the admin Menu table both assemble the two-level
  // tree from `parentId` + this order — top-level items are those with
  // parentId null; a group's dropdown entries are the items pointing at it,
  // each set kept in this same sortOrder.
  return prisma.menuItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: TARGET_INCLUDE,
  });
}

// Confirms a referenced page/category actually exists before a menu item is
// allowed to point at it — "invalid/deleted references must be rejected"
// per the task spec. (Once a menu item DOES point at a real page/category,
// MenuItem.pageId/categoryId are `onDelete: Cascade` in the locked schema,
// so deleting that page/category later automatically removes the menu item
// too — referential integrity is enforced at the database level from that
// point on, not just at creation time.)
async function assertTargetExists(data) {
  if (data.linkType === "page" && data.pageId !== undefined && data.pageId !== null) {
    const page = await prisma.page.findUnique({ where: { id: data.pageId }, select: { id: true } });
    if (!page) {
      throw new ValidationError(`Page ${data.pageId} does not exist.`);
    }
  }
  if (data.linkType === "category" && data.categoryId !== undefined && data.categoryId !== null) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } });
    if (!category) {
      throw new ValidationError(`Category ${data.categoryId} does not exist.`);
    }
  }
}

// Enforces the "one level of nesting" rule:
//   - the parent must exist and be a `group`
//   - a `group` can never itself have a parent
//   - `selfId` (on update) can't be its own parent
async function assertParentValid(parentId, linkType, selfId) {
  if (parentId === undefined || parentId === null) return;

  if (linkType === "group") {
    throw new ValidationError("A group can't be nested under another menu item.");
  }
  if (selfId !== undefined && parentId === selfId) {
    throw new ValidationError("A menu item can't be its own parent.");
  }

  const parent = await prisma.menuItem.findUnique({
    where: { id: parentId },
    select: { id: true, linkType: true, parentId: true },
  });
  if (!parent) {
    throw new ValidationError(`Parent menu item ${parentId} does not exist.`);
  }
  if (parent.linkType !== "group") {
    throw new ValidationError("A menu item can only be nested under a group.");
  }
  if (parent.parentId !== null) {
    throw new ValidationError("Menus support only one level of nesting.");
  }
}

async function create(body) {
  const data = parseMenuItemInput(body, "create");
  await assertTargetExists(data);
  await assertParentValid(data.parentId, data.linkType);

  // No explicit order supplied -> put the new item at the end of the
  // existing list rather than defaulting everything to 0. Same approach as
  // category.service.js.
  if (data.sortOrder === undefined) {
    const last = await prisma.menuItem.aggregate({ _max: { sortOrder: true } });
    data.sortOrder = (last._max.sortOrder ?? -1) + 1;
  }

  return prisma.menuItem.create({ data, include: TARGET_INCLUDE });
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid menu item id.");
  }
  return id;
}

async function getById(rawId) {
  const id = parseId(rawId);
  const menuItem = await prisma.menuItem.findUnique({ where: { id }, include: TARGET_INCLUDE });
  if (!menuItem) {
    throw new NotFoundError("Menu item not found.");
  }
  return menuItem;
}

async function update(rawId, body) {
  const id = parseId(rawId);

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Menu item not found.");
  }

  const data = parseMenuItemInput(body, "update");
  await assertTargetExists(data);

  const effectiveLinkType = data.linkType ?? existing.linkType;
  // parentId may be changing, or the linkType may be changing in a way that
  // affects nesting — re-validate against the effective link type either way.
  if (data.parentId !== undefined) {
    await assertParentValid(data.parentId, effectiveLinkType, id);
  }

  // Turning a group into a normal link would orphan its dropdown children.
  if (existing.linkType === "group" && effectiveLinkType !== "group") {
    const childCount = await prisma.menuItem.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new ValidationError(
        "This group still has items nested under it. Move or delete them before changing its type."
      );
    }
  }

  return prisma.menuItem.update({ where: { id }, data, include: TARGET_INCLUDE });
}

async function remove(rawId) {
  const id = parseId(rawId);

  const menuItem = await prisma.menuItem.findUnique({ where: { id } });
  if (!menuItem) {
    throw new NotFoundError("Menu item not found.");
  }

  // A `group` cascade-deletes its children (MenuItem.parent onDelete:
  // Cascade). Block that here so a group can't be removed while it still
  // holds dropdown items — the admin must reassign/remove them first, so a
  // single delete can never silently take several nav entries with it.
  if (menuItem.linkType === "group") {
    const childCount = await prisma.menuItem.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new ValidationError(
        `"${menuItem.label}" still has ${childCount} item(s) nested under it. Move or delete them first.`
      );
    }
  }

  await prisma.menuItem.delete({ where: { id } });
}

async function reorder(rawOrder) {
  const order = Array.isArray(rawOrder) ? rawOrder : null;
  if (!order || order.length === 0) {
    throw new ValidationError('Provide an "order" array of menu item ids in the desired order.');
  }

  const ids = order.map((value) => Number(value));
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new ValidationError("Every id in the order array must be a positive integer.");
  }

  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    throw new ValidationError("The order array contains duplicate menu item ids.");
  }

  const existingMenuItems = await prisma.menuItem.findMany({ select: { id: true } });
  const existingIds = new Set(existingMenuItems.map((m) => m.id));

  const isCompleteMatch =
    existingIds.size === uniqueIds.size && [...existingIds].every((id) => uniqueIds.has(id));
  if (!isCompleteMatch) {
    throw new ValidationError("The order array must include every existing menu item exactly once.");
  }

  // Sequential integers assigned by array position (0..n-1) — this is what
  // keeps sortOrder values contiguous and conflict-free without the schema
  // needing a uniqueness constraint. Same transaction pattern as
  // category.service.js.
  await prisma.$transaction(
    ids.map((id, index) => prisma.menuItem.update({ where: { id }, data: { sortOrder: index } }))
  );

  return list();
}

module.exports = { list, create, getById, update, remove, reorder };
