const { asyncHandler } = require("../utils/asyncHandler");
const menuItemService = require("../services/menuItem.service");

const list = asyncHandler(async (req, res) => {
  const menuItems = await menuItemService.list();
  res.json({ menuItems });
});

const create = asyncHandler(async (req, res) => {
  const menuItem = await menuItemService.create(req.body);
  res.status(201).json({ menuItem });
});

const getOne = asyncHandler(async (req, res) => {
  const menuItem = await menuItemService.getById(req.params.id);
  res.json({ menuItem });
});

const update = asyncHandler(async (req, res) => {
  const menuItem = await menuItemService.update(req.params.id, req.body);
  res.json({ menuItem });
});

const remove = asyncHandler(async (req, res) => {
  await menuItemService.remove(req.params.id);
  res.json({ success: true });
});

const reorder = asyncHandler(async (req, res) => {
  const menuItems = await menuItemService.reorder(req.body?.order);
  res.json({ menuItems });
});

// Public — no req.admin available here. Same data as list() (there is no
// "published" concept for menu items in the schema), just reachable without
// authentication for the public site's navigation.
const getPublic = asyncHandler(async (req, res) => {
  const menuItems = await menuItemService.list();
  res.json({ menuItems });
});

module.exports = { list, create, getOne, update, remove, reorder, getPublic };
