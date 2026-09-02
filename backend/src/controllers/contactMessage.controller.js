const { asyncHandler } = require("../utils/asyncHandler");
const service = require("../services/contactMessage.service");

// Admin read/moderate for Contact + Work With Me enquiries (Phase 4). Public
// submission (POST /api/contact) lives separately in contact.controller.js /
// contact.service.js — enquiries are never created here.

const list = asyncHandler(async (req, res) => {
  const result = await service.list(req.query);
  res.json(result);
});

const setHandled = asyncHandler(async (req, res) => {
  const message = await service.setHandled(req.params.id, req.body);
  res.json({ message });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.json({ success: true });
});

module.exports = { list, setHandled, remove };
