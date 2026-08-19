const express = require("express");
const menuItemController = require("../controllers/menuItem.controller");

// Public — mounted at /menu in routes/index.js (NOT under /admin/*, and NOT
// wrapped with requireAdmin), giving GET /api/menu. Same "separate public
// router, separate mount point" pattern established for comments and
// subscribers (publicComment.routes.js, publicSubscriber.routes.js). The
// admin CRUD surface for menu items stays at /admin/menu
// (menuItem.routes.js), completely untouched by this file.
const router = express.Router();

router.get("/", menuItemController.getPublic);

module.exports = router;
