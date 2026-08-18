const { prisma } = require("../config/prisma");
const { parsePostInput, resolveTagIds, VALID_STATUSES } = require("../utils/validation/posts");
const { NotFoundError, ValidationError, ConflictError } = require("../utils/errors");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const POST_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  author: { select: { id: true, name: true } },
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
};

// Number(null) === 0 and Number("") === 0, both of which pass
// Number.isInteger() — without this check an omitted query param would
// silently clamp to `min` instead of using `fallback` (this exact bug was
// caught and fixed during Phase 2D verification).
function clampInt(raw, fallback, min, max) {
  if (raw === null || raw === undefined || raw === "") return fallback;
  const num = Number(raw);
  if (!Number.isInteger(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function toPublicPost(post) {
  return { ...post, tags: post.tags.map((postTag) => postTag.tag) };
}

async function list(query) {
  const page = clampInt(query.page, 1, 1, 1_000_000);
  const limit = clampInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const categoryId = Number(query.category);
  const status = query.status;

  const where = {};
  if (search) {
    // MySQL's default collation (utf8mb4_*_ci) is case-insensitive, so a
    // plain `contains` is enough — Prisma's `mode: "insensitive"` option
    // isn't supported on the MySQL connector.
    where.title = { contains: search };
  }
  if (query.category && Number.isInteger(categoryId) && categoryId > 0) {
    where.categoryId = categoryId;
  }
  if (status && VALID_STATUSES.includes(status)) {
    where.status = status;
  }

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: [{ publishDate: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishDate: true,
        featuredImageUrl: true,
        shortDescription: true,
        allowComments: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
        // content intentionally excluded — not needed for a list view
      },
    }),
  ]);

  return {
    data: posts.map(toPublicPost),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function create(body) {
  const data = parsePostInput(body, "create");

  const [category, author, existingSlug] = await Promise.all([
    prisma.category.findUnique({ where: { id: data.categoryId } }),
    prisma.author.findUnique({ where: { id: data.authorId } }),
    prisma.post.findUnique({ where: { slug: data.slug } }),
  ]);

  if (!category) {
    throw new ValidationError("Selected category does not exist.");
  }
  if (!author) {
    throw new ValidationError("Selected author does not exist.");
  }
  if (existingSlug) {
    throw new ConflictError(`A post with the slug "${data.slug}" already exists.`);
  }

  const tagIds = (await resolveTagIds(prisma, body?.tags)) ?? [];

  const post = await prisma.post.create({
    data: {
      ...data,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    include: POST_INCLUDE,
  });

  return toPublicPost(post);
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid post id.");
  }
  return id;
}

async function getById(rawId) {
  const id = parseId(rawId);
  const post = await prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
  if (!post) {
    throw new NotFoundError("Post not found.");
  }
  return toPublicPost(post);
}

async function update(rawId, body) {
  const id = parseId(rawId);

  const existingPost = await prisma.post.findUnique({ where: { id } });
  if (!existingPost) {
    throw new NotFoundError("Post not found.");
  }

  const data = parsePostInput(body, "update");

  if (data.categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw new ValidationError("Selected category does not exist.");
    }
  }

  if (data.authorId !== undefined) {
    const author = await prisma.author.findUnique({ where: { id: data.authorId } });
    if (!author) {
      throw new ValidationError("Selected author does not exist.");
    }
  }

  if (data.slug && data.slug !== existingPost.slug) {
    const conflict = await prisma.post.findFirst({ where: { slug: data.slug, NOT: { id } } });
    if (conflict) {
      throw new ConflictError(`A post with the slug "${data.slug}" already exists.`);
    }
  }

  const hasTags = Object.prototype.hasOwnProperty.call(body ?? {}, "tags");
  const tagIds = hasTags ? await resolveTagIds(prisma, body.tags) : undefined;

  const operations = [prisma.post.update({ where: { id }, data })];
  if (hasTags) {
    // Delete-then-recreate keeps this simple and guarantees no stale
    // PostTag rows survive a tag change.
    operations.push(prisma.postTag.deleteMany({ where: { postId: id } }));
    for (const tagId of tagIds) {
      operations.push(prisma.postTag.create({ data: { postId: id, tagId } }));
    }
  }
  await prisma.$transaction(operations);

  const post = await prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
  return toPublicPost(post);
}

async function remove(rawId) {
  const id = parseId(rawId);

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    throw new NotFoundError("Post not found.");
  }

  // PostTag.postId and Comment.postId are both `onDelete: Cascade` in the
  // schema — deleting the post cascades to both automatically, no orphaned
  // rows, no separate cleanup needed here.
  await prisma.post.delete({ where: { id } });
}

module.exports = { list, create, getById, update, remove };
