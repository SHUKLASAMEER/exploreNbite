const express = require("express");
const pageController = require("../controllers/page.controller");

// Public — mounted at /pages in routes/index.js. GET / lists every page
// (title/slug only via pageService.list — Page has no draft state, so this
// exposes nothing that isn't already reachable by slug) so the frontend
// sitemap can enumerate them; GET /:slug serves a single page. The admin
// CRUD surface stays at /admin/pages (page.routes.js), untouched.
const router = express.Router();

router.get("/", pageController.list);
router.get("/:slug", pageController.getPublicBySlug);

module.exports = router;
