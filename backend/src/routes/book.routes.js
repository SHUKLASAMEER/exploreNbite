const express = require("express");
const bookController = require("../controllers/book.controller");

const router = express.Router();

router.get("/", bookController.list);
router.post("/", bookController.create);
router.get("/:id", bookController.getOne);
router.patch("/:id", bookController.update);
router.delete("/:id", bookController.remove);

module.exports = router;
