const express = require("express");
const pageController = require("../controllers/page.controller");

const router = express.Router();

router.get("/", pageController.list);
router.post("/", pageController.create);
router.get("/:id", pageController.getOne);
router.patch("/:id", pageController.update);
router.delete("/:id", pageController.remove);

module.exports = router;
