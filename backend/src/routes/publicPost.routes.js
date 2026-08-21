const express = require("express");
const postController = require("../controllers/post.controller");

// Public — mounted at /posts in routes/index.js, alongside
// publicComment.routes.js (also mounted at /posts, handling
// /:postId/comments — a different path shape, no collision). GET / (list,
// published only) and GET /:slug (single post, published only) here are
// read-only and unauthenticated. The admin CRUD surface for posts stays at
// /admin/posts (post.routes.js), completely untouched by this file.
const router = express.Router();

router.get("/", postController.listPublic);
router.get("/:slug", postController.getPublicBySlug);

module.exports = router;
