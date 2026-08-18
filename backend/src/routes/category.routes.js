const express = require("express");
const categoryController = require("../controllers/category.controller");

const router = express.Router();

// NOTE: '/reorder' must be registered before '/:id' — Express matches
// routes in registration order (unlike Next.js's file-based router, which
// resolves static-vs-dynamic segments automatically), so a static path can
// get shadowed by an earlier dynamic one if declared after it.
router.get("/", categoryController.list);
router.post("/", categoryController.create);
router.patch("/reorder", categoryController.reorder);
router.get("/:id", categoryController.getOne);
router.patch("/:id", categoryController.update);
router.delete("/:id", categoryController.remove);

module.exports = router;
