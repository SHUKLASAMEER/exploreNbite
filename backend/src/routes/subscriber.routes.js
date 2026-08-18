const express = require("express");
const subscriberController = require("../controllers/subscriber.controller");

// Admin routes — mounted at /admin/subscribers with requireAdmin in
// routes/index.js. No POST here: subscribers are only ever created via the
// public route (routes/publicSubscriber.routes.js), never by an admin
// directly. No PATCH either — the locked Subscriber template
// (Phase 1.5 Section 10) is view + export + delete only, no status editing.
const router = express.Router();

router.get("/", subscriberController.list);
router.get("/:id", subscriberController.getOne);
router.delete("/:id", subscriberController.remove);

module.exports = router;
