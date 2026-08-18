const express = require("express");
const menuItemController = require("../controllers/menuItem.controller");

const router = express.Router();

// NOTE: '/reorder' must be registered before '/:id' — same ordering
// requirement documented in category.routes.js.
router.get("/", menuItemController.list);
router.post("/", menuItemController.create);
router.patch("/reorder", menuItemController.reorder);
router.get("/:id", menuItemController.getOne);
router.patch("/:id", menuItemController.update);
router.delete("/:id", menuItemController.remove);

module.exports = router;
