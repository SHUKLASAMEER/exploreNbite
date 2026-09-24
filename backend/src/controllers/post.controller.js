const { asyncHandler } = require("../utils/asyncHandler");
const postService = require("../services/post.service");

const list = asyncHandler(async (req, res) => {
  const result = await postService.list(req.query);
  res.json(result);
});

const create = asyncHandler(async (req, res) => {
  const post = await postService.create(req.body);
  res.status(201).json({ post });
});

const getOne = asyncHandler(async (req, res) => {
  const post = await postService.getById(req.params.id);
  res.json({ post });
});

const update = asyncHandler(async (req, res) => {
  const post = await postService.update(req.params.id, req.body);
  res.json({ post });
});

const remove = asyncHandler(async (req, res) => {
  await postService.remove(req.params.id);
  res.json({ success: true });
});

// POST /api/admin/posts/bulk-delete   { ids: [1,2,3] }
// Never claims more than what actually happened — always reports which
// requested ids didn't exist rather than silently treating them as deleted.
const bulkDelete = asyncHandler(async (req, res) => {
  const result = await postService.bulkRemove(req.body?.ids);
  res.json(result);
});

// POST /api/admin/posts/bulk-status   { ids: [1,2,3], status: "published" }
// Only `status` changes on the affected posts.
const bulkStatus = asyncHandler(async (req, res) => {
  const result = await postService.bulkUpdateStatus(req.body?.ids, req.body?.status);
  res.json(result);
});

// Admin-only (this router is behind requireAdmin). Returns the sanitized
// content HTML for the editor's live preview — persists nothing.
const preview = asyncHandler(async (req, res) => {
  res.json({ content: postService.sanitizePreviewContent(req.body?.content) });
});

// POST /api/admin/posts/:id/autosave — writes ONLY a PostRevision row, never
// the live post. { revisionId, createdAt, stale } — `stale` flags that the
// post has been saved elsewhere since the editor loaded (see
// post.service.js#autosave); it is informational, not a failure.
const autosave = asyncHandler(async (req, res) => {
  const result = await postService.autosave(req.params.id, req.body ?? {});
  res.json(result);
});

// GET /api/admin/posts/:id/revisions — metadata only (id/type/title/
// createdAt); use GET .../revisions/:revisionId for the full snapshot.
const listRevisions = asyncHandler(async (req, res) => {
  const revisions = await postService.listRevisions(req.params.id, req.query.limit);
  res.json({ revisions });
});

const getRevision = asyncHandler(async (req, res) => {
  const revision = await postService.getRevision(req.params.id, req.params.revisionId);
  res.json({ revision });
});

// POST /api/admin/posts/:id/revisions/:revisionId/restore — NEVER writes to
// the post; returns the full snapshot for the client to load into the
// editor's draft form state. Persisting still requires an explicit Save
// (PATCH /api/admin/posts/:id), same as any other edit.
const restoreRevision = asyncHandler(async (req, res) => {
  const revision = await postService.restoreRevision(req.params.id, req.params.revisionId);
  res.json({ revision });
});

// Public — no req.admin available here. Always forces status: "published"
// (overriding any status the client sent), so a public request can never
// list drafts.
//
// A non-empty `search` is routed to postService.searchPublished (title +
// description + content + tag + category, relevance-ordered). Everything
// else — the home feed, category/author archives, plain listing — still
// goes through postService.list unchanged. The endpoint, query params and
// response shape are identical either way.
const listPublic = asyncHandler(async (req, res) => {
  const hasSearch = typeof req.query.search === "string" && req.query.search.trim() !== "";
  const result = hasSearch
    ? await postService.searchPublished(req.query)
    : await postService.list({ ...req.query, status: "published" });
  res.json(result);
});

// `adjacent` = { previous, next } published posts in the same primary
// category, for the end-of-article navigation (null at either end).
const getPublicBySlug = asyncHandler(async (req, res) => {
  const post = await postService.getBySlug(req.params.slug);
  const adjacent = await postService.getAdjacentPublished(post);
  res.json({ post, adjacent });
});

module.exports = {
  list,
  create,
  getOne,
  update,
  remove,
  bulkDelete,
  bulkStatus,
  autosave,
  listRevisions,
  getRevision,
  restoreRevision,
  preview,
  listPublic,
  getPublicBySlug,
};
