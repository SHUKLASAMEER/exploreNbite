const express = require("express");
const authorController = require("../controllers/author.controller");

// Public — mounted at /authors in routes/index.js. GET / and GET /:id
// (Author has no slug column — id-based lookup is the only option). The
// admin CRUD surface stays at /admin/authors (author.routes.js), untouched.
const router = express.Router();

router.get("/", authorController.listPublic);
router.get("/:id", authorController.getPublicOne);

module.exports = router;
