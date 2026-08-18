const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { slugify } = require("../utils/slugify");
const { ValidationError } = require("../utils/errors");

// backend/uploads/ — a sibling of src/, not inside it, and explicitly NOT
// inside frontend/public/. Created on boot if missing so a fresh clone
// works without a manual setup step; gitignored (see root .gitignore) so
// uploaded files themselves are never committed.
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Images only, per the task's own scope — no schema field exists for a
// general "file type", and nothing in the project needs non-image uploads
// yet. The extension used on disk is taken from this map (i.e. from the
// validated MIME type), never from the client's original filename — that
// is what stops a client from naming a file "photo.jpg" while uploading
// something else and having it land on disk with a client-chosen extension.
const ALLOWED_MIME_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — a sane cap for blog images.

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    // Never trust the original filename as the filesystem filename: reuse
    // the project's existing slugify() to sanitize it into a safe base
    // (strips path separators, punctuation, whitespace — the exact same
    // treatment already applied to category/post/page slugs), then append
    // random bytes so two uploads of "photo.jpg" can never collide or
    // overwrite each other. The extension comes from ALLOWED_MIME_TYPES
    // above, not from the client.
    const extension = ALLOWED_MIME_TYPES[file.mimetype];
    const originalBase = path.basename(file.originalname, path.extname(file.originalname));
    const safeBase = slugify(originalBase).slice(0, 80) || "upload";
    const unique = crypto.randomBytes(4).toString("hex");
    cb(null, `${safeBase}-${unique}${extension}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(new ValidationError("Only JPEG, PNG, GIF, or WebP images are allowed."));
    return;
  }
  cb(null, true);
}

const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

// Express middleware wrapper: normalizes multer's own error shape (e.g.
// LIMIT_FILE_SIZE) into the project's existing ValidationError so it flows
// through the shared error-handling middleware exactly like every other
// validation failure — no changes needed to middleware/errorHandler.js.
function uploadSingleImage(req, res, next) {
  multerUpload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return next(new ValidationError(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`));
      }
      return next(err);
    }
    next();
  });
}

module.exports = { uploadSingleImage, UPLOADS_DIR, MAX_FILE_SIZE, ALLOWED_MIME_TYPES };
