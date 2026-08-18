const { asyncHandler } = require("../utils/asyncHandler");
const bookService = require("../services/book.service");

const list = asyncHandler(async (req, res) => {
  const books = await bookService.list();
  res.json({ books });
});

const create = asyncHandler(async (req, res) => {
  const book = await bookService.create(req.body);
  res.status(201).json({ book });
});

const getOne = asyncHandler(async (req, res) => {
  const book = await bookService.getById(req.params.id);
  res.json({ book });
});

const update = asyncHandler(async (req, res) => {
  const book = await bookService.update(req.params.id, req.body);
  res.json({ book });
});

const remove = asyncHandler(async (req, res) => {
  await bookService.remove(req.params.id);
  res.json({ success: true });
});

module.exports = { list, create, getOne, update, remove };
