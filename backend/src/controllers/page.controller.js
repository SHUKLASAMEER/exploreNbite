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

module.exports = { list, create, getOne, update, remove };
