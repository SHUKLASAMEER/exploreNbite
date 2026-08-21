const { asyncHandler } = require("../utils/asyncHandler");
const pageService = require("../services/page.service");

const list = asyncHandler(async (req, res) => {
  const pages = await pageService.list();
  res.json({ pages });
});

const create = asyncHandler(async (req, res) => {
  const page = await pageService.create(req.body);
  res.status(201).json({ page });
});

const getOne = asyncHandler(async (req, res) => {
  const page = await pageService.getById(req.params.id);
  res.json({ page });
});

const update = asyncHandler(async (req, res) => {
  const page = await pageService.update(req.params.id, req.body);
  res.json({ page });
});

const remove = asyncHandler(async (req, res) => {
  await pageService.remove(req.params.id);
  res.json({ success: true });
});

// Public — no req.admin available here. Slug-based lookup (public URLs use
// slugs); Page has no draft/published concept so no extra filter applies.
const getPublicBySlug = asyncHandler(async (req, res) => {
  const page = await pageService.getBySlug(req.params.slug);
  res.json({ page });
});

module.exports = { list, create, getOne, update, remove, getPublicBySlug };
