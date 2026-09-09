const express = require("express");
const sidebarController = require("../controllers/sidebar.controller");

// Public — mounted at /sidebar in routes/index.js (NOT under /admin/*, NOT
// wrapped with requireAdmin). GET / only. Same pattern as
// publicSettings.routes.js. The admin surface stays at /admin/sidebar.
const router = express.Router();

router.get("/", sidebarController.getPublic);

module.exports = router;
