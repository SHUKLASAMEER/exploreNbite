const { prisma } = require("../config/prisma");
const { parsePublicCommentInput } = require("../utils/validation/comments");
const { enforceHoneypot } = require("../utils/antiSpam");
const { NotFoundError, ValidationError, AppError } = require("../utils/errors");

const STATUSES = ["pending", "approved", "spam"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const COMMENT_INCLUDE = {
  post: { select: { id: true, title: true, slug: true } },
};

// Number(null) === 0 and Number("") === 0, both of which pass
// Number.isInteger() — without this check an omitted query param would
// silently clamp to `min` instead of using `fallback` (same fix already
// applied to the Posts list endpoint in Phase 2D).
function clampInt(raw, fallback, min, max) {
  if (raw === null || raw === undefined || raw === "") return fallback;
  const num = Number(raw);
  if (!Number.isInteger(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid comment id.");
  }
  return id;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

async function list(query) {
  const page = clampInt(query.page, 1, 1, 1_000_000);
  const limit = clampInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const status = query.status;
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const postId = Number(query.postId);

  const where = {};
  if (status && STATUSES.includes(status)) {
    where.status = status;
  }
  if (query.postId && Number.isInteger(postId) && postId > 0) {
    where.postId = postId;
  }
  if (search) {
    // MySQL's default collation (utf8mb4_*_ci) is case-insensitive, so a
    // plain `contains` is enough — same precedent as the Posts title
    // search (Phase 2D).
    where.OR = [
      { readerName: { contains: search } },
      { email: { contains: search } },
      { message: { contains: search } },
    ];
  }

  const [total, comments] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: COMMENT_INCLUDE,
    }),
  ]);

  return {
    data: comments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getById(rawId) {
  const id = parseId(rawId);
  const comment = await prisma.comment.findUnique({ where: { id }, include: COMMENT_INCLUDE });
  if (!comment) {
    throw new NotFoundError("Comment not found.");
  }
  return comment;
}

async function updateStatus(rawId, body) {
  const id = parseId(rawId);

  const existing = await prisma.comment.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Comment not found.");
  }

  const status = body?.status;
  if (!STATUSES.includes(status)) {
    throw new ValidationError(`Status must be one of: ${STATUSES.join(", ")}.`);
  }

  // Only the status column is ever written here — readerName/email/message
  // are not editable via this endpoint, and the related Post row is never
  // touched by a comment status change.
  return prisma.comment.update({ where: { id }, data: { status }, include: COMMENT_INCLUDE });
}

async function remove(rawId) {
  const id = parseId(rawId);

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    throw new NotFoundError("Comment not found.");
  }

  // Comments have no dependents in the schema — deleting one never
  // cascades into or otherwise affects the related Post or any other
  // record.
  await prisma.comment.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

// Public — no req.admin available here. Only ever returns status:
// "approved" comments (pending/spam stay admin-only until moderated), and
// deliberately excludes `email` from the selection, same as createPublic()'s
// response below — a commenter's email is never exposed publicly.
async function listPublicByPost(rawPostId) {
  const postId = Number(rawPostId);
  if (!Number.isInteger(postId) || postId <= 0) {
    throw new ValidationError("Invalid post id.");
  }

  return prisma.comment.findMany({
    where: { postId, status: "approved" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, readerName: true, message: true, createdAt: true },
  });
}

async function createPublic(rawPostId, body) {
  // Silent honeypot check — rejects bot submissions that fill the hidden
  // "website" field, with a generic error (no "you're a bot" signal).
  enforceHoneypot(body);

  const postId = Number(rawPostId);
  if (!Number.isInteger(postId) || postId <= 0) {
    throw new ValidationError("Invalid post id.");
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, allowComments: true },
  });
  if (!post) {
    throw new NotFoundError("Post not found.");
  }
  if (!post.allowComments) {
    // Post.allowComments exists specifically to gate this (Phase 2D's
    // locked Blog Post template: "Allow Comments — Yes/No toggle") —
    // honoring it here is implementing the existing field, not inventing a
    // new rule.
    throw new AppError("Comments are disabled for this post.", 403, "COMMENTS_DISABLED");
  }

  // parsePublicCommentInput only ever reads readerName/email/message off
  // the body — status is set explicitly to "pending" below regardless of
  // anything the client sent, so a public request can never create an
  // approved/spam comment or set any other field.
  const data = parsePublicCommentInput(body);

  const comment = await prisma.comment.create({
    data: { postId, ...data, status: "pending" },
    select: { id: true, readerName: true, message: true, status: true, createdAt: true },
  });

  return comment;
}

module.exports = { list, getById, updateStatus, remove, createPublic, listPublicByPost };
