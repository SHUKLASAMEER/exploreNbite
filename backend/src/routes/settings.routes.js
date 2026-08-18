const express = require("express");
const settingsController = require("../controllers/settings.controller");

const router = express.Router();

// Singleton resource — no /:id, no POST/DELETE. Just the one row.
router.get("/", settingsController.getOne);
router.patch("/", settingsController.update);

module.exports = router;
