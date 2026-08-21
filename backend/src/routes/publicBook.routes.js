const express = require("express");
const bookController = require("../controllers/book.controller");

// Public — mounted at /books in routes/index.js. GET / only (a books grid
// page has no need for a separate detail route — listPublic() already
// returns full rows including buyLinks). The admin CRUD surface stays at
// /admin/books (book.routes.js), untouched.
const router = express.Router();

router.get("/", bookController.listPublic);

module.exports = router;
