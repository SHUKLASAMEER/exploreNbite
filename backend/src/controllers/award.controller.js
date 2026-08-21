const { asyncHandler } = require("../utils/asyncHandler");
const awardService = require("../services/award.service");

const list = asyncHandler(async (req, res) => {
  const awards = await awardService.list();
  res.json({ awards });
});

const create = asyncHandler(async (req, res) => {
  const award = await awardService.create(req.body);
  res.status(201).json({ award });
});

const getOne = asyncHandler(async (req, res) => {
  const award = await awardService.getById(req.params.id);
  res.json({ award });
});

const update = asyncHandler(async (req, res) => {
  const award = await awardService.update(req.params.id, req.body);
  res.json({ award });
});

const remove = asyncHandler(async (req, res) => {
  await awardService.remove(req.params.id);
  res.json({ success: true });
});

// Public — no req.admin available here. Same data as list() — Award has no
// fields unsafe for public exposure.
const listPublic = asyncHandler(async (req, res) => {
  const awards = await awardService.list();
  res.json({ awards });
});

module.exports = { list, create, getOne, update, remove, listPublic };
