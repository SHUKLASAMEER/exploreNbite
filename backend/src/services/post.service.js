const { prisma } = require("../config/prisma");
const { parsePostInput, resolveTagIds, resolveCategoryIds, VALID_STATUSES } = require("../utils/validation/posts");
const { NotFoundError, ValidationError, ConflictError } = require("../utils/errors");
const { sanitizeContentHtml } = require("../utils/sanitizeHtml");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const CATEGORY_SELECT = { select: { id: true, name: true, slug: true } };

const POST_INCLUDE = {
  category: CATEGORY_SELECT,
  author: { select: { id: true, name: true, photoUrl: true } },
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
  categories: { select: { category: CATEGORY_SELECT } },
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

// `categories` on the returned post is the *full* set (primary + any extra
// post_categories rows) as a flat, deduped array of {id,name,slug} — this is
// what PostCard renders as multiple category badges, matching how a
// WordPress post can list several categories at once. `category` (singular)
// is left untouched for every existing single-category consumer.
function toPublicPost(post) {
  const extra = (post.categories ?? []).map((link) => link.category);
  const categories = [post.category, ...extra.filter((c) => c.id !== post.category.id)];
  return { ...post, tags: post.tags.map((postTag) => postTag.tag), categories };
}

const LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  status: true,
  sticky: true,
  publishDate: true,
  featuredImageUrl: true,
  shortDescription: true,
  allowComments: true,
  createdAt: true,
  updatedAt: true,
  category: CATEGORY_SELECT,
  author: { select: { id: true, name: true, photoUrl: true } },
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
  categories: { select: { category: CATEGORY_SELECT } },
  // content intentionally excluded — not needed for a list view
};

async function list(query) {
  const page = clampInt(query.page, 1, 1, 1_000_000);
  const limit = clampInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const categoryId = Number(query.category);
  const authorId = Number(query.author);
  const status = query.status;

  const where = {};
  if (search) {
    // MySQL's default collation (utf8mb4_*_ci) is case-insensitive, so a
    // plain `contains` is enough — Prisma's `mode: "insensitive"` option
    // isn't supported on the MySQL connector.
    where.title = { contains: search };
  }
  // A category filter matches posts whose *primary* categoryId is this
  // category, OR that have it as an extra post_categories row — this is
  // what lets /category/home/ show every post WordPress files there, not
  // just the ones primarily filed under it. See the schema-header note on
  // PostCategory.
  if (query.category && Number.isInteger(categoryId) && categoryId > 0) {
    where.OR = [{ categoryId }, { categories: { some: { categoryId } } }];
  }
  // `author` filter added for the public author-archive page (Phase 3 Part
  // 2) — optional and additive, same shape as the `category` filter above;
  // omitted entirely when absent so existing callers are unaffected.
  if (query.author && Number.isInteger(authorId) && authorId > 0) {
    where.authorId = authorId;
  }
  if (status && VALID_STATUSES.includes(status)) {
    where.status = status;
  }

  // `sticky=1` opts into the live site's actual front-page pagination
  // behavior (verified against explorenbite.com, not guessed): sticky
  // posts are *prepended* to page 1 on top of the normal page size, never
  // repeated on later pages, and `totalPages` is still `ceil(total/limit)`
  // over *every* published post — WordPress computes it that way too, so
  // page 1 alone (all sticky + one page of non-sticky) is legitimately
  // larger than every later page. Only the home page ("/") passes this;
  // category archives and the small sidebar widget fetches (Recommended
  // Post, Recent Posts — verified against the live sidebar, which ignores
  // sticky entirely) never do, so they're unaffected.
  const wantsStickyFeed = (query.sticky === "1" || query.sticky === true) && !where.OR && !where.authorId && !search;

  if (wantsStickyFeed) {
    const [total, stickyPosts, pageNonSticky] = await Promise.all([
      prisma.post.count({ where }),
      page === 1
        ? prisma.post.findMany({
            where: { ...where, sticky: true },
            orderBy: [{ publishDate: "desc" }, { id: "desc" }],
            select: LIST_SELECT,
          })
        : Promise.resolve([]),
      prisma.post.findMany({
        where: { ...where, sticky: false },
        orderBy: [{ publishDate: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: LIST_SELECT,
      }),
    ]);

    return {
      data: [...stickyPosts, ...pageNonSticky].map(toPublicPost),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: [{ publishDate: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: LIST_SELECT,
    }),
  ]);

  return {
    data: posts.map(toPublicPost),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// Admin post preview: run the editor's current (unsaved) content HTML through
// the EXACT same write-boundary sanitizer as create()/update() and hand it
// straight back — nothing is written to the database. This lets the admin
// preview route render draft/unsaved content with the same security rules
// public content is held to, without ever persisting or exposing it.
function sanitizePreviewContent(content) {
  return sanitizeContentHtml(typeof content === "string" ? content : "");
}

async function create(body) {
  const data = parsePostInput(body, "create");
  // Harden admin-authored rich text at the write boundary (removes
  // <script>/event handlers/js: URIs/untrusted iframes; keeps all normal
  // formatting). See utils/sanitizeHtml.js.
  if (data.content != null) data.content = sanitizeContentHtml(data.content);

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
  const categoryIds = (await resolveCategoryIds(prisma, body?.categoryIds, data.categoryId)) ?? [];

  const post = await prisma.post.create({
    data: {
      ...data,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
      categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
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

// Public — no req.admin available here. Unlike getById() (used only by the
// admin editor, which legitimately needs to load a draft), this always
// enforces status: "published" so a public URL can never expose a draft or
// leak its content, regardless of how the slug was discovered.
async function getBySlug(slug) {
  const post = await prisma.post.findUnique({ where: { slug }, include: POST_INCLUDE });
  if (!post || post.status !== "published") {
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
  if (data.content != null) data.content = sanitizeContentHtml(data.content);

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

  const hasCategoryIds = Object.prototype.hasOwnProperty.call(body ?? {}, "categoryIds");
  const effectivePrimaryCategoryId = data.categoryId ?? existingPost.categoryId;
  const categoryIds = hasCategoryIds
    ? await resolveCategoryIds(prisma, body.categoryIds, effectivePrimaryCategoryId)
    : undefined;

  const operations = [prisma.post.update({ where: { id }, data })];
  if (hasTags) {
    // Delete-then-recreate keeps this simple and guarantees no stale
    // PostTag rows survive a tag change.
    operations.push(prisma.postTag.deleteMany({ where: { postId: id } }));
    for (const tagId of tagIds) {
      operations.push(prisma.postTag.create({ data: { postId: id, tagId } }));
    }
  }
  if (hasCategoryIds) {
    // Same delete-then-recreate pattern as tags above, for post_categories.
    operations.push(prisma.postCategory.deleteMany({ where: { postId: id } }));
    for (const categoryId of categoryIds) {
      operations.push(prisma.postCategory.create({ data: { postId: id, categoryId } }));
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

module.exports = { list, create, getById, getBySlug, update, remove, sanitizePreviewContent };
