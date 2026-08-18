const { asyncHandler } = require("../utils/asyncHandler");
const authorService = require("../services/author.service");

const list = asyncHandler(async (req, res) => {
  const authors = await authorService.list();
  res.json({ authors });
});

const create = asyncHandler(async (req, res) => {
  const author = await authorService.create(req.body);
  res.status(201).json({ author });
});

const getOne = asyncHandler(async (req, res) => {
  const author = await authorService.getById(req.params.id);
  res.json({ author });
});

const update = asyncHandler(async (req, res) => {
  const author = await authorService.update(req.params.id, req.body);
  res.json({ author });
});

const remove = asyncHandler(async (req, res) => {
  await authorService.remove(req.params.id);
  res.json({ success: true });
});

module.exports = { list, create, getOne, update, remove };
