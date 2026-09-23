const { prisma } = require("../config/prisma");
const { parsePostInput, resolveTagIds, resolveCategoryIds, VALID_STATUSES } = require("../utils/validation/posts");
const { parseAutosaveInput, snapshotsEqual } = require("../utils/validation/revisions");
const { NotFoundError, ValidationError, ConflictError } = require("../utils/errors");
const { sanitizeContentHtml } = require("../utils/sanitizeHtml");
const { escapeLike } = require("../utils/escapeLike");

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

// ---------------------------------------------------------------------------
// Public search — title + description + content + tag + category
// ---------------------------------------------------------------------------
// Used only by the public GET /api/posts endpoint when `search` is a
// non-empty string (see post.controller.listPublic). list() above is left
// exactly as it was — the home feed, category/author archives, the sidebar
// widgets and the admin post list all still go through it unchanged.
//
// How it works, and why this shape:
//   - ~125 posts / ~640 tags / 7 categories. One indexed query returns the
//     full match set (bounded by SEARCH_SCAN_CAP as a guardrail); relevance
//     scoring + pagination then happen in application code. Prisma can't
//     express "order by which field matched", and at this scale scanning the
//     matches in JS is cheaper than several ordered SQL round-trips.
//   - Every filter is a Prisma `contains` -> a parameterised `LIKE ?`. No
//     raw SQL, no interpolation, no injection surface. Case-insensitivity
//     comes from the column collation (utf8mb4_*_ci), same as list().
//   - Each term's `%`, `_` and `\` are escaped (escapeLike) before they reach
//     the LIKE pattern, so they match literally instead of as wildcards.
//     Relevance scoring below still uses the raw, unescaped term.
//   - status: "published" is forced here regardless of the caller, so search
//     can never surface a draft, its content, its tags or its slug.
//   - A multi-word query is AND-ed across terms, each term OR-ed across the
//     six searchable text sources — "coorg beach" finds posts where both
//     words appear somewhere in the searchable fields, not only an exact
//     phrase.

// Relevance tiers (Search Improvement task, section 4). A term scores the
// value of the single highest-priority field it appears in; a post's score
// is the sum over the query's terms. Ties break on publishDate desc, id desc.
const SEARCH_TIER = { title: 5, description: 4, tag: 3, category: 2, content: 1 };

// Hard ceiling on how many matching rows we pull back to score in memory.
// The catalogue is ~125 posts; this only exists so a future 100k-post
// catalogue degrades to "first 500 newest matches" instead of loading
// everything. Revisit (move scoring into SQL / add a real search index)
// well before the catalogue approaches this number.
const SEARCH_SCAN_CAP = 500;

function splitSearchTerms(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

// One term -> OR across every searchable text source. Category is matched
// both as the post's primary `category` relation and via the extra
// `post_categories` links, mirroring how list()'s category filter works.
function searchTermClause(term) {
  const pattern = escapeLike(term);
  const nameOrSlug = { OR: [{ name: { contains: pattern } }, { slug: { contains: pattern } }] };
  return {
    OR: [
      { title: { contains: pattern } },
      { shortDescription: { contains: pattern } },
      { content: { contains: pattern } },
      { category: nameOrSlug },
      { categories: { some: { category: nameOrSlug } } },
      { tags: { some: { tag: nameOrSlug } } },
    ],
  };
}

function scoreSearchMatch(post, terms) {
  const title = (post.title || "").toLowerCase();
  const description = (post.shortDescription || "").toLowerCase();
  const tagText = (post.tags || [])
    .map((pt) => `${pt.tag.name} ${pt.tag.slug}`)
    .join(" ")
    .toLowerCase();
  const categoryText = [post.category, ...(post.categories || []).map((c) => c.category)]
    .filter(Boolean)
    .map((c) => `${c.name} ${c.slug}`)
    .join(" ")
    .toLowerCase();
  const content = (post.content || "").toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += SEARCH_TIER.title;
    else if (description.includes(term)) score += SEARCH_TIER.description;
    else if (tagText.includes(term)) score += SEARCH_TIER.tag;
    else if (categoryText.includes(term)) score += SEARCH_TIER.category;
    else if (content.includes(term)) score += SEARCH_TIER.content;
    // else: the DB matched this term (that's why the row is here) but only
    // inside HTML markup that our lowercased raw-string checks don't isolate
    // — leave it contributing 0 rather than dropping the post.
  }
  return score;
}

async function searchPublished(query) {
  const terms = splitSearchTerms(query.search);
  const page = clampInt(query.page, 1, 1, 1_000_000);
  const limit = clampInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);

  // Whitespace-only / empty -> no query at all. The public endpoint only
  // routes here when `search` is non-empty, but guard anyway.
  if (terms.length === 0) {
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  const where = { status: "published", AND: terms.map(searchTermClause) };

  // Preserve list()'s optional category/author narrowing if a caller ever
  // combines them with a search (the public search page never does today).
  const categoryId = Number(query.category);
  if (query.category && Number.isInteger(categoryId) && categoryId > 0) {
    where.AND.push({ OR: [{ categoryId }, { categories: { some: { categoryId } } }] });
  }
  const authorId = Number(query.author);
  if (query.author && Number.isInteger(authorId) && authorId > 0) {
    where.authorId = authorId;
  }

  const matches = await prisma.post.findMany({
    where,
    orderBy: [{ publishDate: "desc" }, { id: "desc" }],
    take: SEARCH_SCAN_CAP,
    // content is needed for scoring the "content match" tier; it is stripped
    // back out below so the response shape stays identical to list().
    select: { ...LIST_SELECT, content: true },
  });

  const ranked = matches
    .map((post) => ({ post, score: scoreSearchMatch(post, terms) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.post.publishDate) - new Date(a.post.publishDate) ||
        b.post.id - a.post.id
    );

  const total = ranked.length;
  const start = (page - 1) * limit;
  const data = ranked.slice(start, start + limit).map(({ post }) => {
    // eslint-disable-next-line no-unused-vars
    const { content, ...listShape } = post;
    return toPublicPost(listShape);
  });

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// Admin post preview: run the editor's current (unsaved) content HTML through
// the EXACT same write-boundary sanitizer as create()/update() and hand it
// straight back — nothing is written to the database. This lets the admin
// preview route render draft/unsaved content with the same security rules
// public content is held to, without ever persisting or exposing it.
function sanitizePreviewContent(content) {
  return sanitizeContentHtml(typeof content === "string" ? content : "");
}

// ---------------------------------------------------------------------------
// Post revisions (Autosave + Revisions task)
// ---------------------------------------------------------------------------
// Snapshots of a post's EDITABLE fields only, stored in PostRevision — see
// the schema-header note there for the full rationale. Nothing in this
// section ever writes to the `posts` table; only create()/update() below
// (the existing, unmodified persistence path) do that.

const REVISION_RETENTION_LIMIT = 20;

function parseRevisionId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid revision id.");
  }
  return id;
}

// Builds a revision snapshot from an already-persisted, toPublicPost()-
// shaped post (used right after create()/update() succeed, for the
// automatic "manual" revision).
function snapshotFromPost(post) {
  const extraCategoryIds = (post.categories ?? [])
    .filter((c) => c.id !== post.categoryId)
    .map((c) => c.id);
  return {
    title: post.title,
    slug: post.slug,
    shortDescription: post.shortDescription,
    content: post.content,
    featuredImageUrl: post.featuredImageUrl,
    categoryId: post.categoryId,
    authorId: post.authorId,
    categoryIds: extraCategoryIds,
    tagNames: (post.tags ?? []).map((t) => t.name),
  };
}

// Inserts a new revision unless it would be identical (Section 9 —
// deduplication) to the most recent one for this post, in which case that
// existing, unmodified row is returned instead. Retention is enforced only
// AFTER a new row is safely persisted, and only the oldest rows beyond the
// limit are removed (Section 8).
async function createRevision(postId, snapshot, type) {
  const latest = await prisma.postRevision.findFirst({
    where: { postId },
    orderBy: { createdAt: "desc" },
  });
  if (latest && snapshotsEqual(latest, snapshot)) {
    return latest;
  }

  const created = await prisma.postRevision.create({
    data: {
      postId,
      type,
      title: snapshot.title,
      slug: snapshot.slug,
      shortDescription: snapshot.shortDescription,
      content: snapshot.content,
      featuredImageUrl: snapshot.featuredImageUrl,
      categoryId: snapshot.categoryId,
      authorId: snapshot.authorId,
      categoryIds: snapshot.categoryIds,
      tagNames: snapshot.tagNames,
    },
  });

  const total = await prisma.postRevision.count({ where: { postId } });
  if (total > REVISION_RETENTION_LIMIT) {
    const stale = await prisma.postRevision.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      take: total - REVISION_RETENTION_LIMIT,
      select: { id: true },
    });
    if (stale.length > 0) {
      await prisma.postRevision.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
    }
  }

  return created;
}

// Best-effort: a revision-history failure must never fail the actual save
// (create()/update() have already succeeded by the time this runs) — logged
// server-side only.
async function snapshotAfterSave(postId, publicPost) {
  try {
    await createRevision(postId, snapshotFromPost(publicPost), "manual");
  } catch (err) {
    console.error(`Failed to record a manual revision for post ${postId}:`, err instanceof Error ? err.message : err);
  }
}

// POST /api/admin/posts/:id/autosave
//
// The ONLY thing this ever touches is post_revisions — never the `posts`
// table, so a published post's live content can never change because of an
// autosave, and a failed/unauthorized autosave can never leave the post in
// a half-changed state. Validation is deliberately lenient (see
// parseAutosaveInput) since this is a draft workspace, not a publish
// action.
async function autosave(rawPostId, body) {
  const id = parseId(rawPostId);
  const existing = await prisma.post.findUnique({ where: { id }, select: { id: true, updatedAt: true } });
  if (!existing) {
    throw new NotFoundError("Post not found.");
  }

  const snapshot = parseAutosaveInput(body);
  const revision = await createRevision(id, snapshot, "autosave");

  // Concurrency signal (Section 13) — never a lock, just an honest flag.
  // The client sends back the Post.updatedAt it loaded the editor with; if
  // the live post has since changed (a manual save from another tab/admin),
  // that means this autosave was drafted against a base that's no longer
  // current. The autosave itself still always succeeds (again: it only
  // writes a revision row), but the client can warn the admin instead of
  // silently continuing to draft on stale ground.
  const baseUpdatedAt = body?.baseUpdatedAt ? new Date(body.baseUpdatedAt) : null;
  const stale = Boolean(
    baseUpdatedAt &&
      !Number.isNaN(baseUpdatedAt.getTime()) &&
      existing.updatedAt.getTime() !== baseUpdatedAt.getTime()
  );

  return { revisionId: revision.id, createdAt: revision.createdAt, stale };
}

// GET /api/admin/posts/:id/revisions — metadata only (id/type/title/
// createdAt), never the content, so a history panel never has to pull full
// HTML bodies just to render a timestamp list (Section 14). Capped at the
// retention limit — there is never more than that many rows to return.
async function listRevisions(rawPostId, rawLimit) {
  const id = parseId(rawPostId);
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
  if (!post) {
    throw new NotFoundError("Post not found.");
  }

  const limit = clampInt(rawLimit, REVISION_RETENTION_LIMIT, 1, REVISION_RETENTION_LIMIT);
  return prisma.postRevision.findMany({
    where: { postId: id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, type: true, title: true, createdAt: true },
  });
}

// GET /api/admin/posts/:id/revisions/:revisionId — the full snapshot, for
// an explicit preview. A revision id that exists but belongs to a
// DIFFERENT post is treated as not found (never leaks another post's
// content just because the id was guessable).
async function getRevision(rawPostId, rawRevisionId) {
  const postId = parseId(rawPostId);
  const revisionId = parseRevisionId(rawRevisionId);

  const revision = await prisma.postRevision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.postId !== postId) {
    throw new NotFoundError("Revision not found.");
  }
  return revision;
}

// POST /api/admin/posts/:id/revisions/:revisionId/restore
//
// Deliberately identical to getRevision(): "restore" NEVER writes to the
// `posts` table. It only validates the revision belongs to this post and
// hands the full snapshot back to the client, which loads it into the
// editor's form state — the same in-memory state a normal edit lives in
// until Save is clicked. Persisting anything still goes through the
// existing update() below (full tag/category reconciliation included), so
// restoring a revision can never publish a post or bypass that logic.
async function restoreRevision(rawPostId, rawRevisionId) {
  return getRevision(rawPostId, rawRevisionId);
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

  const publicPost = toPublicPost(post);
  await snapshotAfterSave(publicPost.id, publicPost);
  return publicPost;
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
  const publicPost = toPublicPost(post);
  await snapshotAfterSave(id, publicPost);
  return publicPost;
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

// ---------------------------------------------------------------------------
// Bulk actions (Admin Posts manager) — delete and status change only.
// Title/slug/author/tags/categories/media are never touched by either.
// ---------------------------------------------------------------------------

// A generous but real ceiling — the admin UI only ever sends the current
// page's row ids (<= its own page size), never the whole catalogue; this
// just stops a malformed/hostile request body from asking for an unbounded
// scan.
const MAX_BULK_IDS = 500;

// Same per-id shape as parseId() above, applied to every entry: rejects the
// whole request (not just the bad entry) on the first non-positive-integer
// id, so a malformed array can never partially apply. Duplicates are
// silently deduped (a double-toggled checkbox is not an error).
function parseIdList(rawIds) {
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    throw new ValidationError('Provide a non-empty "ids" array of post ids.');
  }
  if (rawIds.length > MAX_BULK_IDS) {
    throw new ValidationError(`No more than ${MAX_BULK_IDS} ids may be processed in one request.`);
  }
  const seen = new Set();
  const ids = [];
  for (const raw of rawIds) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError("Every id must be a positive integer.");
    }
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

// POST /api/admin/posts/bulk-delete   { ids: [1,2,3] }
//
// Existence is checked and the delete performed inside one transaction, so
// the "which ids were missing" answer is always consistent with what was
// actually deleted. PostTag/Comment/PostCategory all cascade (same as the
// single remove() above) — no separate cleanup needed. An id that doesn't
// exist is reported back, never silently ignored or treated as success.
async function bulkRemove(rawIds) {
  const ids = parseIdList(rawIds);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.post.findMany({ where: { id: { in: ids } }, select: { id: true } });
    const existingIds = existing.map((p) => p.id);
    const missingIds = ids.filter((id) => !existingIds.includes(id));

    const result = await tx.post.deleteMany({ where: { id: { in: existingIds } } });

    return { requested: ids.length, deleted: result.count, missingIds };
  });
}

// POST /api/admin/posts/bulk-status   { ids: [1,2,3], status: "published" }
//
// One updateMany for every valid, existing id — not a loop of per-post
// updates. Only `status` changes; title/slug/author/tags/categories/media
// are untouched. Only the two real Post.status values are ever accepted
// (VALID_STATUSES, imported above — no new status is invented here).
async function bulkUpdateStatus(rawIds, rawStatus) {
  const ids = parseIdList(rawIds);
  if (!VALID_STATUSES.includes(rawStatus)) {
    throw new ValidationError(`Status must be one of: ${VALID_STATUSES.join(", ")}.`);
  }

  const existing = await prisma.post.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const existingIds = new Set(existing.map((p) => p.id));
  const missingIds = ids.filter((id) => !existingIds.has(id));

  const result = await prisma.post.updateMany({
    where: { id: { in: ids } },
    data: { status: rawStatus },
  });

  return { requested: ids.length, updated: result.count, status: rawStatus, missingIds };
}

module.exports = {
  list,
  searchPublished,
  create,
  getById,
  getBySlug,
  update,
  remove,
  bulkRemove,
  bulkUpdateStatus,
  sanitizePreviewContent,
  autosave,
  listRevisions,
  getRevision,
  restoreRevision,
};
