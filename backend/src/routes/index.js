const express = require("express");
const { requireAdmin } = require("../middleware/requireAdmin");

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const categoryRoutes = require("./category.routes");
const postRoutes = require("./post.routes");
const tagRoutes = require("./tag.routes");
const authorRoutes = require("./author.routes");
const pageRoutes = require("./page.routes");
const bookRoutes = require("./book.routes");
const awardRoutes = require("./award.routes");
const commentRoutes = require("./comment.routes");
const publicCommentRoutes = require("./publicComment.routes");

const router = express.Router();

// Public.
router.use("/health", healthRoutes);

// Public — POST /api/posts/:postId/comments only. Not an admin Posts
// module (that's /admin/posts below) and not wrapped with requireAdmin —
// the one write endpoint a visitor can call without logging in.
router.use("/posts", publicCommentRoutes);

// /api/admin/auth mixes public (login/logout) and protected (me) routes
// internally — see routes/auth.routes.js — so it is NOT blanket-wrapped
// with requireAdmin here, unlike every other /api/admin/* module below.
router.use("/admin/auth", authRoutes);

// Every other admin module is protected in full: mounting requireAdmin
// once per router here is what gives a new module "protected by default"
// without remembering to add the check to each individual route — the same
// guarantee the old single-app architecture's proxy.js gave via its
// blanket /api/admin/:path* matcher.
router.use("/admin/categories", requireAdmin, categoryRoutes);
router.use("/admin/posts", requireAdmin, postRoutes);
router.use("/admin/tags", requireAdmin, tagRoutes);
router.use("/admin/authors", requireAdmin, authorRoutes);
router.use("/admin/pages", requireAdmin, pageRoutes);
router.use("/admin/books", requireAdmin, bookRoutes);
router.use("/admin/awards", requireAdmin, awardRoutes);
router.use("/admin/comments", requireAdmin, commentRoutes);

module.exports = router;
