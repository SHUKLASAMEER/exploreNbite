const { prisma } = require("../config/prisma");
const { parseCategoryInput } = require("../utils/validation/categories");
const { NotFoundError, ValidationError, ConflictError } = require("../utils/errors");

async function list() {
  return prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
}

async function create(body) {
  const data = parseCategoryInput(body, "create");

  const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
  if (existing) {
    throw new ConflictError(`A category with the slug "${data.slug}" already exists.`);
  }

  // No explicit order supplied -> put the new category at the end of the
  // existing list rather than defaulting everything to 0.
  if (data.sortOrder === undefined) {
    const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
    data.sortOrder = (last._max.sortOrder ?? -1) + 1;
  }

  return prisma.category.create({ data });
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid category id.");
  }
  return id;
}

async function getById(rawId) {
  const id = parseId(rawId);
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new NotFoundError("Category not found.");
  }
  return category;
}

// Public — no req.admin available here. Category has no draft/published
// concept in the schema, so this is a plain slug lookup, no extra filter.
async function getBySlug(slug) {
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) {
    throw new NotFoundError("Category not found.");
  }
  return category;
}

async function update(rawId, body) {
  const id = parseId(rawId);

  const existingCategory = await prisma.category.findUnique({ where: { id } });
  if (!existingCategory) {
    throw new NotFoundError("Category not found.");
  }

  const data = parseCategoryInput(body, "update");

  // Only check for a slug collision if the slug is actually changing — this
  // is what lets an edit keep the category's own existing slug.
  if (data.slug && data.slug !== existingCategory.slug) {
    const conflict = await prisma.category.findFirst({ where: { slug: data.slug, NOT: { id } } });
    if (conflict) {
      throw new ConflictError(`A category with the slug "${data.slug}" already exists.`);
    }
  }

  return prisma.category.update({ where: { id }, data });
}

async function remove(rawId) {
  const id = parseId(rawId);

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new NotFoundError("Category not found.");
  }

  // Posts.categoryId is a required FK with ON DELETE RESTRICT (locked
  // schema decision) — check first so the admin gets a clear, actionable
  // message instead of a raw database error.
  const postCount = await prisma.post.count({ where: { categoryId: id } });
  if (postCount > 0) {
    throw new ConflictError(
      `This category is used by ${postCount} post${postCount === 1 ? "" : "s"} and can't be deleted. Reassign or remove ${postCount === 1 ? "that post" : "those posts"} first.`
    );
  }

  await prisma.category.delete({ where: { id } });
}

async function reorder(rawOrder) {
  const order = Array.isArray(rawOrder) ? rawOrder : null;
  if (!order || order.length === 0) {
    throw new ValidationError('Provide an "order" array of category ids in the desired order.');
  }

  const ids = order.map((value) => Number(value));
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new ValidationError("Every id in the order array must be a positive integer.");
  }

  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    throw new ValidationError("The order array contains duplicate category ids.");
  }

  const existingCategories = await prisma.category.findMany({ select: { id: true } });
  const existingIds = new Set(existingCategories.map((c) => c.id));

  const isCompleteMatch =
    existingIds.size === uniqueIds.size && [...existingIds].every((id) => uniqueIds.has(id));
  if (!isCompleteMatch) {
    throw new ValidationError("The order array must include every existing category exactly once.");
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.category.update({ where: { id }, data: { sortOrder: index } }))
  );

  return list();
}

module.exports = { list, create, getById, getBySlug, update, remove, reorder };
