const express = require("express");
const tagController = require("../controllers/tag.controller");

// Mounted at /api/admin/tags behind requireAdmin (routes/index.js). REST
// shape matches the other admin taxonomy modules (categories, pages).
const router = express.Router();

router.get("/", tagController.list);
router.post("/", tagController.create);
router.get("/:id", tagController.getOne);
router.patch("/:id", tagController.update);
router.delete("/:id", tagController.remove);
router.post("/:id/merge", tagController.merge);

module.exports = router;
