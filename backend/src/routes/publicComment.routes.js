const express = require("express");
const commentController = require("../controllers/comment.controller");
const { publicWriteRateLimit } = require("../middleware/rateLimit");

// Public — mounted at /posts in routes/index.js (NOT under /admin/*, and
// NOT wrapped with requireAdmin), giving POST /api/posts/:postId/comments
// (the one write endpoint in the whole API a visitor can call without
// logging in) and GET /api/posts/:postId/comments (approved comments only,
// for display under a single post — added in Phase 3 Part 2). Also mounted
// at /posts: publicPost.routes.js (GET / and GET /:slug) — distinct path
// shapes, no collision.
const router = express.Router();

router.get("/:postId/comments", commentController.listPublicByPost);
router.post("/:postId/comments", publicWriteRateLimit, commentController.createPublic);

module.exports = router;
