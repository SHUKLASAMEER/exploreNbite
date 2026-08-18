const express = require("express");
const mediaController = require("../controllers/media.controller");
const { uploadSingleImage } = require("../middleware/upload");

// Mounted at /admin/media with requireAdmin in routes/index.js — same
// pattern as every other admin module. uploadSingleImage runs only on the
// POST route, ahead of the controller, so req.file is populated by the
// time media.controller.js#create runs.
const router = express.Router();

router.get("/", mediaController.list);
router.post("/", uploadSingleImage, mediaController.create);
router.get("/:id", mediaController.getOne);
router.patch("/:id", mediaController.update);
router.delete("/:id", mediaController.remove);

module.exports = router;
