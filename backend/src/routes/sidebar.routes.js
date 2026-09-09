const express = require("express");
const sidebarController = require("../controllers/sidebar.controller");

// Admin — mounted at /admin/sidebar (requireAdmin) in routes/index.js.
const router = express.Router();

router.get("/", sidebarController.getAdmin);
router.patch("/:layout", sidebarController.updateLayout);

module.exports = router;
