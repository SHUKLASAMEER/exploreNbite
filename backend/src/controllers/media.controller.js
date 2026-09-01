const { asyncHandler } = require("../utils/asyncHandler");
const mediaService = require("../services/media.service");

const list = asyncHandler(async (req, res) => {
  const result = await mediaService.list(req.query, req);
  res.json(result);
});

// req.file is populated by middleware/upload.js's uploadSingleImage
// (mounted in routes/media.routes.js) before this ever runs.
const create = asyncHandler(async (req, res) => {
  const media = await mediaService.create(req.file, req.body, req.admin);
  res.status(201).json({ media });
});

const getOne = asyncHandler(async (req, res) => {
  const media = await mediaService.getById(req.params.id);
  res.json({ media });
});

const update = asyncHandler(async (req, res) => {
  const media = await mediaService.update(req.params.id, req.body);
  res.json({ media });
});

const remove = asyncHandler(async (req, res) => {
  await mediaService.remove(req.params.id);
  res.json({ success: true });
});

module.exports = { list, create, getOne, update, remove };
