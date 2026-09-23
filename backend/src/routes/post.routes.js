const express = require("express");
const postController = require("../controllers/post.controller");

const router = express.Router();

router.get("/", postController.list);
router.post("/", postController.create);
// Must be registered before '/:id' so these literal paths aren't parsed as
// an id.
router.post("/preview", postController.preview);
router.post("/bulk-delete", postController.bulkDelete);
router.post("/bulk-status", postController.bulkStatus);
router.get("/:id", postController.getOne);
router.patch("/:id", postController.update);
router.delete("/:id", postController.remove);

// Autosave + Revisions — distinct path depth from '/:id' above, so route
// order doesn't matter here, but kept grouped for readability.
router.post("/:id/autosave", postController.autosave);
router.get("/:id/revisions", postController.listRevisions);
router.get("/:id/revisions/:revisionId", postController.getRevision);
router.post("/:id/revisions/:revisionId/restore", postController.restoreRevision);

module.exports = router;
