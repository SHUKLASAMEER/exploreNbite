const { asyncHandler } = require("../utils/asyncHandler");
const authorService = require("../services/author.service");

const list = asyncHandler(async (req, res) => {
  const authors = await authorService.list();
  res.json({ authors });
});

module.exports = { list };
