const express = require("express");
const awardController = require("../controllers/award.controller");

// Public — mounted at /awards in routes/index.js. GET / only. The admin
// CRUD surface stays at /admin/awards (award.routes.js), untouched.
const router = express.Router();

router.get("/", awardController.listPublic);

module.exports = router;
