const express = require("express");
const aiController = require("../controllers/ai.controller");
const { aiSeoRateLimit } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/seo-suggestions", aiSeoRateLimit, aiController.generateSeoSuggestions);

module.exports = router;
