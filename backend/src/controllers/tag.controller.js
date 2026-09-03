const { asyncHandler } = require("../utils/asyncHandler");
const tagService = require("../services/tag.service");

const list = asyncHandler(async (req, res) => {
  const tags = await tagService.list();
  res.json({ tags });
});

// Explicit tag creation from the post editor. Idempotent by slug: if an
// equivalent tag already exists it's returned as-is (201 either way is
// fine here — the client only cares about the resulting {id, name, slug}).
const create = asyncHandler(async (req, res) => {
  const tag = await tagService.create(req.body?.name);
  res.status(201).json({ tag });
});

module.exports = { list, create };
