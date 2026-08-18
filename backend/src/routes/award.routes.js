const express = require("express");
const awardController = require("../controllers/award.controller");

const router = express.Router();

router.get("/", awardController.list);
router.post("/", awardController.create);
router.get("/:id", awardController.getOne);
router.patch("/:id", awardController.update);
router.delete("/:id", awardController.remove);

module.exports = router;
