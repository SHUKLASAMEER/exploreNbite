const express = require("express");
const postController = require("../controllers/post.controller");

const router = express.Router();

router.get("/", postController.list);
router.post("/", postController.create);
// Must be registered before '/:id' so "preview" isn't parsed as an id.
router.post("/preview", postController.preview);
router.get("/:id", postController.getOne);
router.patch("/:id", postController.update);
router.delete("/:id", postController.remove);

module.exports = router;
