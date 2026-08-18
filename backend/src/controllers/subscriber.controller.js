const { asyncHandler } = require("../utils/asyncHandler");
const subscriberService = require("../services/subscriber.service");

// Public — no req.admin available here.
const subscribePublic = asyncHandler(async (req, res) => {
  const subscriber = await subscriberService.subscribe(req.body);
  res.status(201).json({ subscriber });
});

const list = asyncHandler(async (req, res) => {
  const result = await subscriberService.list(req.query);
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const subscriber = await subscriberService.getById(req.params.id);
  res.json({ subscriber });
});

const remove = asyncHandler(async (req, res) => {
  await subscriberService.remove(req.params.id);
  res.json({ success: true });
});

module.exports = { subscribePublic, list, getOne, remove };
