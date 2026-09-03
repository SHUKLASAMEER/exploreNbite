const express = require("express");
const tagController = require("../controllers/tag.controller");

const router = express.Router();

router.get("/", tagController.list);
router.post("/", tagController.create);

module.exports = router;
