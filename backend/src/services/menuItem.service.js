const { prisma } = require("../config/prisma");
const { parseMenuItemInput } = require("../utils/validation/menuItems");
const { NotFoundError, ValidationError } = require("../utils/errors");

// Every list/detail/create/update response resolves the linked page/category
// so the frontend never has to cross-reference ids itself — same "include
// what the UI needs" approach as Media's uploader include.
const TARGET_INCLUDE = {
  page: { select: { id: true, title: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
};

async function list() {
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

async function create(body) {
  const data = parseMenuItemInput(body, "create");
  await assertTargetExists(data);

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

  return prisma.menuItem.update({ where: { id }, data, include: TARGET_INCLUDE });
}

async function remove(rawId) {
  const id = parseId(rawId);

  const menuItem = await prisma.menuItem.findUnique({ where: { id } });
  if (!menuItem) {
    throw new NotFoundError("Menu item not found.");
  }

  // Nothing else in the schema references menu_items.id — deleting one can
  // never orphan or cascade into anything else. Same reasoning as
  // award.service.js.
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
