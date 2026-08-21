const { asyncHandler } = require("../utils/asyncHandler");
const categoryService = require("../services/category.service");

const list = asyncHandler(async (req, res) => {
  const categories = await categoryService.list();
  res.json({ categories });
});

const create = asyncHandler(async (req, res) => {
  const category = await categoryService.create(req.body);
  res.status(201).json({ category });
});

const getOne = asyncHandler(async (req, res) => {
  const category = await categoryService.getById(req.params.id);
  res.json({ category });
});

const update = asyncHandler(async (req, res) => {
  const category = await categoryService.update(req.params.id, req.body);
  res.json({ category });
});

const remove = asyncHandler(async (req, res) => {
  await categoryService.remove(req.params.id);
  res.json({ success: true });
});

const reorder = asyncHandler(async (req, res) => {
  const categories = await categoryService.reorder(req.body?.order);
  res.json({ categories });
});

// Public — no req.admin available here. Same data as list()/getOne(), just
// slug-based lookup for getPublicBySlug since public URLs use slugs.
const listPublic = asyncHandler(async (req, res) => {
  const categories = await categoryService.list();
  res.json({ categories });
});

const getPublicBySlug = asyncHandler(async (req, res) => {
  const category = await categoryService.getBySlug(req.params.slug);
  res.json({ category });
});

module.exports = { list, create, getOne, update, remove, reorder, listPublic, getPublicBySlug };
