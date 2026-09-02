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
const subscriberRoutes = require("./subscriber.routes");
const publicSubscriberRoutes = require("./publicSubscriber.routes");
const mediaRoutes = require("./media.routes");
const settingsRoutes = require("./settings.routes");
const menuItemRoutes = require("./menuItem.routes");
const publicMenuRoutes = require("./publicMenu.routes");
const publicSettingsRoutes = require("./publicSettings.routes");
const publicPostRoutes = require("./publicPost.routes");
const publicCategoryRoutes = require("./publicCategory.routes");
const publicAuthorRoutes = require("./publicAuthor.routes");
const publicBookRoutes = require("./publicBook.routes");
const publicAwardRoutes = require("./publicAward.routes");
const publicPageRoutes = require("./publicPage.routes");
const contactRoutes = require("./contact.routes");
const contactMessageRoutes = require("./contactMessage.routes");

const router = express.Router();

// Public.
router.use("/health", healthRoutes);

// Public — GET/POST /api/posts/:postId/comments (publicCommentRoutes) plus
// GET /api/posts and GET /api/posts/:slug (publicPostRoutes) — two routers
// mounted at the same base path, matched by distinct sub-paths, same as any
// other Express router stack. Not the admin Posts module (that's
// /admin/posts below) and not wrapped with requireAdmin.
// publicWriteRateLimit (20 req / 10 min / IP — generous, never blocks real
// use) guards the three visitor-writable endpoints against bulk spam. It is
// attached inside each write route definition (POST only) so the GET halves
// of these same routers are unaffected — see publicComment.routes.js,
// publicSubscriber.routes.js, contact.routes.js.
router.use("/posts", publicCommentRoutes);
router.use("/posts", publicPostRoutes);

// Public — POST /api/subscribers only. Same pattern as the comments route
// above: a separate public router mounted outside /admin/*.
router.use("/subscribers", publicSubscriberRoutes);

// Public — POST /api/contact (Contact + Work With Me enquiry forms).
router.use("/contact", contactRoutes);

// Public — GET /api/menu and GET /api/settings only, for the public site's
// navigation and branding/footer/social/contact info. Same pattern as the
// comments/subscribers public routers above; the admin read/write surfaces
// stay at /admin/menu and /admin/settings below, untouched.
router.use("/menu", publicMenuRoutes);
router.use("/settings", publicSettingsRoutes);

// Public — GET /api/categories(/:slug), /api/authors(/:id), /api/books,
// /api/awards, /api/pages/:slug — the public-site read surface for the
// remaining CMS models (Phase 3 Part 2). Same pattern throughout: separate
// public router, no requireAdmin, reuses the existing service layer. Each
// admin CRUD surface (/admin/categories, /admin/authors, /admin/books,
// /admin/awards, /admin/pages below) is untouched.
router.use("/categories", publicCategoryRoutes);
router.use("/authors", publicAuthorRoutes);
router.use("/books", publicBookRoutes);
router.use("/awards", publicAwardRoutes);
router.use("/pages", publicPageRoutes);

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
router.use("/admin/subscribers", requireAdmin, subscriberRoutes);
router.use("/admin/messages", requireAdmin, contactMessageRoutes);
router.use("/admin/media", requireAdmin, mediaRoutes);
router.use("/admin/settings", requireAdmin, settingsRoutes);
router.use("/admin/menu", requireAdmin, menuItemRoutes);

module.exports = router;
