const express = require("express");
const authorController = require("../controllers/author.controller");

const router = express.Router();

router.get("/", authorController.list);
router.post("/", authorController.create);
router.get("/:id", authorController.getOne);
router.patch("/:id", authorController.update);
router.delete("/:id", authorController.remove);

module.exports = router;
