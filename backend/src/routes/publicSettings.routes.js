const express = require("express");
const settingsController = require("../controllers/settings.controller");

// Public — mounted at /settings in routes/index.js (NOT under /admin/*, and
// NOT wrapped with requireAdmin), giving GET /api/settings. Same pattern as
// publicMenu.routes.js. The admin read/write surface stays at
// /admin/settings (settings.routes.js), completely untouched by this file.
const router = express.Router();

router.get("/", settingsController.getPublic);

module.exports = router;
