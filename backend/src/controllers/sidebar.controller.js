const { asyncHandler } = require("../utils/asyncHandler");
const sidebarService = require("../services/sidebar.service");
const { LAYOUT_KEYS, WIDGETS } = require("../config/sidebarWidgets");

// Admin — the full config plus the code-owned registry (so the admin UI can
// render widget labels and the "add widget" picker without hardcoding them).
const getAdmin = asyncHandler(async (req, res) => {
  const config = await sidebarService.getConfig();
  res.json({ config, registry: WIDGETS, layouts: LAYOUT_KEYS });
});

const updateLayout = asyncHandler(async (req, res) => {
  const config = await sidebarService.replaceLayout(req.params.layout, req.body);
  res.json({ config });
});

// Public — just the resolved per-layout widget lists for the site to render.
const getPublic = asyncHandler(async (req, res) => {
  const config = await sidebarService.getConfig();
  res.json({ config });
});

module.exports = { getAdmin, updateLayout, getPublic };
