const express = require("express");
const subscriberController = require("../controllers/subscriber.controller");

// Public — mounted at /subscribers in routes/index.js (NOT under /admin/*,
// and NOT wrapped with requireAdmin), giving POST /api/subscribers. Same
// "separate public router, separate mount point" pattern established for
// comments in Phase 2H (routes/publicComment.routes.js).
const router = express.Router();

router.post("/", subscriberController.subscribePublic);

module.exports = router;
