const express = require("express");
const categoryController = require("../controllers/category.controller");

// Public — mounted at /categories in routes/index.js (NOT under /admin/*,
// and NOT wrapped with requireAdmin), giving GET /api/categories and GET
// /api/categories/:slug. The admin CRUD surface stays at /admin/categories
// (category.routes.js), completely untouched by this file.
const router = express.Router();

router.get("/", categoryController.listPublic);
router.get("/:slug", categoryController.getPublicBySlug);

module.exports = router;
