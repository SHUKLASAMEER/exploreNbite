const { asyncHandler } = require("../utils/asyncHandler");
const subscriberService = require("../services/subscriber.service");

// Public — no req.admin available here.
const subscribePublic = asyncHandler(async (req, res) => {
  const subscriber = await subscriberService.subscribe(req.body);
  res.status(201).json({ subscriber });
});

// Public — active-subscriber count for the sidebar widget. See
// subscriberService.countActive for why this is safe to expose.
const countPublic = asyncHandler(async (req, res) => {
  const count = await subscriberService.countActive();
  res.json({ count });
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

module.exports = { subscribePublic, countPublic, list, getOne, remove };
