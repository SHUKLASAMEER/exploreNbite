const { asyncHandler } = require("../utils/asyncHandler");
const settingsService = require("../services/settings.service");

const getOne = asyncHandler(async (req, res) => {
  const settings = await settingsService.get();
  res.json({ settings });
});

const update = asyncHandler(async (req, res) => {
  const settings = await settingsService.update(req.body);
  res.json({ settings });
});

module.exports = { getOne, update };
