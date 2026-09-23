const { asyncHandler } = require("../utils/asyncHandler");
const seoService = require("../services/ai/seo.service");

// POST /api/admin/ai/seo-suggestions — admin-only (requireAdmin on the
// router), rate-limited (aiSeoRateLimit on the route). Never persists
// anything; the response is pure suggestion data for the editor to review
// and optionally apply to its own local state (task Section 12/13).
const generateSeoSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await seoService.generateSeoSuggestions(req.body);
  res.json({ suggestions });
});

module.exports = { generateSeoSuggestions };
