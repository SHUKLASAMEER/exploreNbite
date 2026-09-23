const { prisma } = require("../config/prisma");
const { parseTagInput, assertSlugLength } = require("../utils/validation/tags");
const { slugify } = require("../utils/slugify");
const { NotFoundError, ValidationError, ConflictError } = require("../utils/errors");

// Same "omitted/empty query param -> use the fallback, not the clamp min"
// fix applied to every other list endpoint in this project.
function clampInt(raw, fallback, min, max) {
  if (raw === null || raw === undefined || raw === "") return fallback;
  const num = Number(raw);
  if (!Number.isInteger(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid tag id.");
  }
  return id;
}

// Usage count = number of PostTag rows for this tag, straight from Prisma's
// relation counter — one query, never loading the posts themselves.
const WITH_USAGE = { _count: { select: { posts: true } } };
const toPublicTag = (t) => ({ id: t.id, name: t.name, slug: t.slug, usageCount: t._count?.posts ?? 0 });

// GET /api/admin/tags
//
// Dual-mode, so the post editor's existing call (no query params) keeps
// getting the plain name-asc `{ tags: [...] }` it expects, while the Tag
// Manager gets a searched + paginated `{ data, pagination }` page with a
// per-tag usageCount.
async function list(query = {}) {
  const q = query && typeof query === "object" ? query : {};
  const wantsPaged =
    q.page !== undefined || q.limit !== undefined || q.search !== undefined;

  if (!wantsPaged) {
    return { tags: await prisma.tag.findMany({ orderBy: { name: "asc" } }) };
  }

  const search = typeof q.search === "string" ? q.search.trim() : "";
  // MySQL's utf8mb4_*_ci collation makes `contains` case-insensitive
  // already — same note as post.service search.
  const where = search
    ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] }
    : {};

  const page = clampInt(q.page, 1, 1, 1_000_000);
  const limit = clampInt(q.limit, 20, 1, 100);

  const [total, rows] = await Promise.all([
    prisma.tag.count({ where }),
    prisma.tag.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }], // deterministic
      skip: (page - 1) * limit,
      take: limit,
      include: WITH_USAGE,
    }),
  ]);

  return {
    data: rows.map(toPublicTag),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getById(rawId) {
  const id = parseId(rawId);
  const tag = await prisma.tag.findUnique({ where: { id }, include: WITH_USAGE });
  if (!tag) throw new NotFoundError("Tag not found.");
  return toPublicTag(tag);
}

// POST /api/admin/tags
//
// Explicit create — from the Tag Manager's "Add Tag" form and the post
// editor's "create tag" action. A slug that already exists is a hard
// ConflictError (409), matching how Categories/Pages handle a duplicate
// slug. (Post *save* still find-or-creates tags via resolveTagIds so a save
// can never fail on a re-used tag name — that path is untouched.)
async function create(body) {
  const parsed = parseTagInput(body, "create");

  const existing = await prisma.tag.findUnique({ where: { slug: parsed.slug } });
  if (existing) {
    throw new ConflictError(`A tag with the slug "${parsed.slug}" already exists.`);
  }

  const created = await prisma.tag.create({ data: { name: parsed.name, slug: parsed.slug } });
  return { id: created.id, name: created.name, slug: created.slug, usageCount: 0 };
}

// PATCH /api/admin/tags/:id
//
// Rename and/or slug edit. The Tag ID never changes, so every existing
// PostTag relationship is preserved automatically — a rename can never
// spawn a second tag. Slug behaviour (see report):
//   - body has no `slug` key      -> keep the current slug (plain rename)
//   - body `slug` is ""           -> regenerate deterministically from the
//                                     new/current name
//   - body `slug` is non-empty    -> use it (normalised, uniqueness-checked)
async function update(rawId, body) {
  const id = parseId(rawId);
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Tag not found.");

  const parsed = parseTagInput(body, "update");

  const data = {};
  if (parsed.name !== undefined && parsed.name !== existing.name) {
    data.name = parsed.name;
  }

  const effectiveName = parsed.name ?? existing.name;
  let nextSlug = existing.slug;
  if (parsed.slugMode === "explicit") {
    nextSlug = parsed.slug;
  } else if (parsed.slugMode === "derive") {
    nextSlug = assertSlugLength(slugify(effectiveName));
  }

  if (nextSlug !== existing.slug) {
    const conflict = await prisma.tag.findFirst({ where: { slug: nextSlug, NOT: { id } } });
    if (conflict) {
      throw new ConflictError(`A tag with the slug "${nextSlug}" already exists.`);
    }
    data.slug = nextSlug;
  }

  if (Object.keys(data).length === 0) {
    return getById(id); // nothing actually changed
  }

  await prisma.tag.update({ where: { id }, data });
  return getById(id);
}

// DELETE /api/admin/tags/:id
//
// Blocked while the tag is in use. PostTag has ON DELETE CASCADE on both
// sides, so a blind delete would silently strip the tag from every post it
// is on — never do that implicitly. Posts are never touched.
async function remove(rawId) {
  const id = parseId(rawId);
  const tag = await prisma.tag.findUnique({ where: { id }, include: WITH_USAGE });
  if (!tag) throw new NotFoundError("Tag not found.");

  const usage = tag._count.posts;
  if (usage > 0) {
    throw new ConflictError(
      `This tag is used by ${usage} post${usage === 1 ? "" : "s"} and can't be deleted. ` +
        `Remove it from ${usage === 1 ? "that post" : "those posts"} first, or merge it into another tag.`
    );
  }

  await prisma.tag.delete({ where: { id } });
}

// POST /api/admin/tags/:id/merge   { targetId }
//
// Moves every PostTag from the source tag onto the target tag, then deletes
// the (now unreferenced) source. Transactional. Posts are never deleted or
// otherwise modified — only PostTag rows change. Duplicate (postId,tagId)
// pairs are skipped (a post already carrying the target keeps a single
// link). Merging a tag into itself is rejected.
async function merge(sourceRawId, body) {
  const sourceId = parseId(sourceRawId);
  const targetId = parseId(body?.targetId);

  if (sourceId === targetId) {
    throw new ValidationError("A tag can't be merged into itself.");
  }

  const [source, target] = await Promise.all([
    prisma.tag.findUnique({ where: { id: sourceId } }),
    prisma.tag.findUnique({ where: { id: targetId } }),
  ]);
  if (!source) throw new NotFoundError("Source tag not found.");
  if (!target) throw new NotFoundError("Target tag not found.");

  await prisma.$transaction(async (tx) => {
    const targetPostIds = new Set(
      (await tx.postTag.findMany({ where: { tagId: targetId }, select: { postId: true } })).map(
        (r) => r.postId
      )
    );
    const sourceLinks = await tx.postTag.findMany({
      where: { tagId: sourceId },
      select: { postId: true },
    });
    const toMove = sourceLinks.map((r) => r.postId).filter((postId) => !targetPostIds.has(postId));

    // Drop all source links first (this also removes the ones that would
    // collide with an existing target link), then recreate the movable ones
    // pointing at the target.
    await tx.postTag.deleteMany({ where: { tagId: sourceId } });
    if (toMove.length > 0) {
      await tx.postTag.createMany({ data: toMove.map((postId) => ({ postId, tagId: targetId })) });
    }
    await tx.tag.delete({ where: { id: sourceId } });
  });

  return getById(targetId);
}

module.exports = { list, getById, create, update, remove, merge };
