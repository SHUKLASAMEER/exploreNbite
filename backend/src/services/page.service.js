const { prisma } = require("../config/prisma");
const { parsePageInput, resolveMenuPosition } = require("../utils/validation/pages");
const { NotFoundError, ValidationError, ConflictError } = require("../utils/errors");
const { sanitizeContentHtml } = require("../utils/sanitizeHtml");

async function list() {
  return prisma.page.findMany({
    orderBy: [{ menuPosition: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      showInMenu: true,
      menuPosition: true,
      createdAt: true,
      updatedAt: true,
      // content intentionally excluded — not needed for a list view
    },
  });
}

async function create(body) {
  const data = parsePageInput(body, "create");
  if (data.content != null) data.content = sanitizeContentHtml(data.content);

  const existingSlug = await prisma.page.findUnique({ where: { slug: data.slug } });
  if (existingSlug) {
    throw new ConflictError(`A page with the slug "${data.slug}" already exists.`);
  }

  data.menuPosition = await resolveMenuPosition(prisma, {
    showInMenu: data.showInMenu,
    menuPosition: data.menuPosition,
  });

  return prisma.page.create({ data });
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid page id.");
  }
  return id;
}

async function getById(rawId) {
  const id = parseId(rawId);
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) {
    throw new NotFoundError("Page not found.");
  }
  return page;
}

// Public — no req.admin available here. Page has no draft/published
// concept in the schema (see prisma/schema.prisma), so any existing page is
// publicly visible once linked — plain slug lookup, no extra filter.
async function getBySlug(slug) {
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) {
    throw new NotFoundError("Page not found.");
  }
  return page;
}

async function update(rawId, body) {
  const id = parseId(rawId);

  const existingPage = await prisma.page.findUnique({ where: { id } });
  if (!existingPage) {
    throw new NotFoundError("Page not found.");
  }

  const data = parsePageInput(body, "update");
  if (data.content != null) data.content = sanitizeContentHtml(data.content);

  if (data.slug && data.slug !== existingPage.slug) {
    const conflict = await prisma.page.findFirst({ where: { slug: data.slug, NOT: { id } } });
    if (conflict) {
      throw new ConflictError(`A page with the slug "${data.slug}" already exists.`);
    }
  }

  const touchesMenu =
    Object.prototype.hasOwnProperty.call(data, "showInMenu") ||
    Object.prototype.hasOwnProperty.call(data, "menuPosition");
  if (touchesMenu) {
    const effectiveShowInMenu = Object.prototype.hasOwnProperty.call(data, "showInMenu")
      ? data.showInMenu
      : existingPage.showInMenu;
    const effectiveMenuPosition = Object.prototype.hasOwnProperty.call(data, "menuPosition")
      ? data.menuPosition
      : existingPage.menuPosition;

    data.menuPosition = await resolveMenuPosition(prisma, {
      showInMenu: effectiveShowInMenu,
      menuPosition: effectiveMenuPosition,
      excludeId: id,
    });
  }

  return prisma.page.update({ where: { id }, data });
}

async function remove(rawId) {
  const id = parseId(rawId);

  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) {
    throw new NotFoundError("Page not found.");
  }

  // MenuItem.pageId is `onDelete: Cascade` in the schema (a locked
  // Phase 1.5 decision) — deleting a page correctly removes only the menu
  // item(s) that specifically pointed to it. No other pages, posts,
  // categories, authors, tags, or unrelated menu items are touched.
  await prisma.page.delete({ where: { id } });
}

module.exports = { list, create, getById, getBySlug, update, remove };
