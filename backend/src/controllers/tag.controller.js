const { asyncHandler } = require("../utils/asyncHandler");
const tagService = require("../services/tag.service");

const list = asyncHandler(async (req, res) => {
  const tags = await tagService.list();
  res.json({ tags });
});

module.exports = { list };
