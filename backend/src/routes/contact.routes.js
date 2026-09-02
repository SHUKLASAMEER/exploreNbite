const express = require("express");
const controller = require("../controllers/contact.controller");
const { publicWriteRateLimit } = require("../middleware/rateLimit");

// Public — mounted at /contact in routes/index.js (NOT under /admin/*, NOT
// wrapped with requireAdmin). Same "separate public router" pattern as
// comments and subscribers. Rate limiting is applied at the mount point.
const router = express.Router();

router.post("/", publicWriteRateLimit, controller.submitPublic);

module.exports = router;
