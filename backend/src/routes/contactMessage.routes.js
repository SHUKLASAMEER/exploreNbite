const express = require("express");
const controller = require("../controllers/contactMessage.controller");

// Admin — mounted at /admin/messages with requireAdmin in routes/index.js.
// Read + mark-handled + delete only; enquiries are never created here (the
// public POST /api/contact is the only create path).
const router = express.Router();

router.get("/", controller.list);
router.patch("/:id", controller.setHandled);
router.delete("/:id", controller.remove);

module.exports = router;
