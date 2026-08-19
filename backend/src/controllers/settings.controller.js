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

// Public — no req.admin available here. Same data as getOne() (Settings has
// no credential/secret fields — see prisma/schema.prisma), just reachable
// without authentication so the public site can render branding/footer/
// social/contact info.
const getPublic = asyncHandler(async (req, res) => {
  const settings = await settingsService.get();
  res.json({ settings });
});

module.exports = { getOne, update, getPublic };
