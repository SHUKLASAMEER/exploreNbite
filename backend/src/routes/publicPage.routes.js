const express = require("express");
const pageController = require("../controllers/page.controller");

// Public — mounted at /pages in routes/index.js. GET /:slug only (a public
// page list isn't needed — pages are reached via Menu items, already
// resolved to {id, title, slug} by menuItem.service.js). The admin CRUD
// surface stays at /admin/pages (page.routes.js), untouched.
const router = express.Router();

router.get("/:slug", pageController.getPublicBySlug);

module.exports = router;
