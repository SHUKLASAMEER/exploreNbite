const express = require("express");
const commentController = require("../controllers/comment.controller");

// Public — mounted at /posts in routes/index.js (NOT under /admin/*, and
// NOT wrapped with requireAdmin), giving POST /api/posts/:postId/comments.
// This is the one write endpoint in the whole API a visitor can call
// without logging in.
const router = express.Router();

router.post("/:postId/comments", commentController.createPublic);

module.exports = router;
