const { prisma } = require("../config/prisma");
const { parseAuthorInput } = require("../utils/validation/authors");
const { NotFoundError, ValidationError, ConflictError } = require("../utils/errors");

// Full Authors CMS — list/create/detail/update/delete. `list()` also
// backs the post editor's author picker (frontend/components/admin/PostForm.js),
// which only ever reads `.id`/`.name` off each entry — returning the fuller
// object here is additive, not a breaking change for that caller.
async function list() {
  return prisma.author.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });
}

async function create(body) {
  const data = parseAuthorInput(body, "create");
  // No unique constraint exists on Author in the locked schema — there is
  // no duplicate/conflict scenario to guard against here.
  return prisma.author.create({ data });
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid author id.");
  }
  return id;
}

async function getById(rawId) {
  const id = parseId(rawId);
  const author = await prisma.author.findUnique({
    where: { id },
    include: { _count: { select: { posts: true } } },
  });
  if (!author) {
    throw new NotFoundError("Author not found.");
  }
  return author;
}

async function update(rawId, body) {
  const id = parseId(rawId);

  const existingAuthor = await prisma.author.findUnique({ where: { id } });
  if (!existingAuthor) {
    throw new NotFoundError("Author not found.");
  }

  const data = parseAuthorInput(body, "update");
  return prisma.author.update({ where: { id }, data });
}

async function remove(rawId) {
  const id = parseId(rawId);

  const author = await prisma.author.findUnique({ where: { id } });
  if (!author) {
    throw new NotFoundError("Author not found.");
  }

  // Post.authorId is a required FK with ON DELETE RESTRICT (locked schema
  // decision) — check first so the admin gets a clear, actionable message
  // instead of a raw database error. Same pattern as category.service.js.
  const postCount = await prisma.post.count({ where: { authorId: id } });
  if (postCount > 0) {
    throw new ConflictError(
      `This author is credited on ${postCount} post${postCount === 1 ? "" : "s"} and can't be deleted. Reassign or remove ${postCount === 1 ? "that post" : "those posts"} first.`
    );
  }

  await prisma.author.delete({ where: { id } });
}

module.exports = { list, create, getById, update, remove };
