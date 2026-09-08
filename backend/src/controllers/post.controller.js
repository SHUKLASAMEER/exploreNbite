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

// Admin-only (this router is behind requireAdmin). Returns the sanitized
// content HTML for the editor's live preview — persists nothing.
const preview = asyncHandler(async (req, res) => {
  res.json({ content: postService.sanitizePreviewContent(req.body?.content) });
});

// Public — no req.admin available here. Always forces status: "published"
// (overriding any status the client sent), so a public request can never
// list drafts.
const listPublic = asyncHandler(async (req, res) => {
  const result = await postService.list({ ...req.query, status: "published" });
  res.json(result);
});

const getPublicBySlug = asyncHandler(async (req, res) => {
  const post = await postService.getBySlug(req.params.slug);
  res.json({ post });
});

module.exports = { list, create, getOne, update, remove, preview, listPublic, getPublicBySlug };
