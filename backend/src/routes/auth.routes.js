const express = require("express");
const authController = require("../controllers/auth.controller");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

// login/logout are intentionally public (see middleware/requireAdmin.js
// comment + backend/README for the rationale, ported from proxy.js's
// PUBLIC_ADMIN_API_PATHS in the previous single-app architecture).
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAdmin, authController.me);

module.exports = router;
