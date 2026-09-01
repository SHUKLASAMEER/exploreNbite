const express = require("express");
const subscriberController = require("../controllers/subscriber.controller");
const { publicWriteRateLimit } = require("../middleware/rateLimit");

// Public — mounted at /subscribers in routes/index.js (NOT under /admin/*,
// and NOT wrapped with requireAdmin), giving POST /api/subscribers. Same
// "separate public router, separate mount point" pattern established for
// comments in Phase 2H (routes/publicComment.routes.js).
const router = express.Router();

router.post("/", publicWriteRateLimit, subscriberController.subscribePublic);
router.get("/count", subscriberController.countPublic);

module.exports = router;
