const { asyncHandler } = require("../utils/asyncHandler");
const commentService = require("../services/comment.service");

const list = asyncHandler(async (req, res) => {
  const result = await commentService.list(req.query);
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const comment = await commentService.getById(req.params.id);
  res.json({ comment });
});

const updateStatus = asyncHandler(async (req, res) => {
  const comment = await commentService.updateStatus(req.params.id, req.body);
  res.json({ comment });
});

const remove = asyncHandler(async (req, res) => {
  await commentService.remove(req.params.id);
  res.json({ success: true });
});

// Public — no req.admin available here.
const createPublic = asyncHandler(async (req, res) => {
  const comment = await commentService.createPublic(req.params.postId, req.body);
  res.status(201).json({ comment });
});

module.exports = { list, getOne, updateStatus, remove, createPublic };
