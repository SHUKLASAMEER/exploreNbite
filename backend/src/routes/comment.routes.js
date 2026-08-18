const express = require("express");
const commentController = require("../controllers/comment.controller");

// Admin moderation routes — mounted at /admin/comments with requireAdmin
// in routes/index.js. No POST here: comments are only ever created via the
// public route (routes/publicComment.routes.js), never by an admin
// directly.
const router = express.Router();

router.get("/", commentController.list);
router.get("/:id", commentController.getOne);
router.patch("/:id", commentController.updateStatus);
router.delete("/:id", commentController.remove);

module.exports = router;
