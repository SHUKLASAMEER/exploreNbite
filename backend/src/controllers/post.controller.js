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

module.exports = { list, create, getOne, update, remove };
