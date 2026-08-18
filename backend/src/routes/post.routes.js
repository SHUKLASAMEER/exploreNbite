const express = require("express");
const postController = require("../controllers/post.controller");

const router = express.Router();

router.get("/", postController.list);
router.post("/", postController.create);
router.get("/:id", postController.getOne);
router.patch("/:id", postController.update);
router.delete("/:id", postController.remove);

module.exports = router;
