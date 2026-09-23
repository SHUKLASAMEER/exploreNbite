const { asyncHandler } = require("../utils/asyncHandler");
const tagService = require("../services/tag.service");

// GET /api/admin/tags
// No query params -> { tags: [...] } (post editor). With page/limit/search
// -> { data, pagination } with per-tag usageCount (Tag Manager).
const list = asyncHandler(async (req, res) => {
  const result = await tagService.list(req.query);
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const tag = await tagService.getById(req.params.id);
  res.json({ tag });
});

// Explicit tag creation (Tag Manager form + post editor "create tag").
// A duplicate slug is a 409 ConflictError.
const create = asyncHandler(async (req, res) => {
  const tag = await tagService.create(req.body ?? {});
  res.status(201).json({ tag });
});

const update = asyncHandler(async (req, res) => {
  const tag = await tagService.update(req.params.id, req.body ?? {});
  res.json({ tag });
});

const remove = asyncHandler(async (req, res) => {
  await tagService.remove(req.params.id);
  res.json({ success: true });
});

const merge = asyncHandler(async (req, res) => {
  const tag = await tagService.merge(req.params.id, req.body ?? {});
  res.json({ tag });
});

module.exports = { list, getOne, create, update, remove, merge };
