const fs = require("fs/promises");
const path = require("path");
const { prisma } = require("../config/prisma");
const { parseMediaUpdateInput } = require("../utils/validation/media");
const { NotFoundError, ValidationError } = require("../utils/errors");
const { UPLOADS_DIR } = require("../middleware/upload");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const UPLOADER_SELECT = { uploader: { select: { id: true, name: true } } };

// Number(null) === 0 and Number("") === 0, both of which pass
// Number.isInteger() — same fix already applied to every other list
// endpoint in this project.
function clampInt(raw, fallback, min, max) {
  if (raw === null || raw === undefined || raw === "") return fallback;
  const num = Number(raw);
  if (!Number.isInteger(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid media id.");
  }
  return id;
}

// Builds the public URL from the *actual incoming request's* origin rather
// than a hardcoded config value, so it's correct in dev regardless of port
// without a new env var.
function toPublicUrl(req, fileName) {
  return `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
}

// ---------------------------------------------------------------------------

async function list(query, req) {
  const page = clampInt(query.page, 1, 1, 1_000_000);
  const limit = clampInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const search = typeof query.search === "string" ? query.search.trim() : "";

  const where = search ? { fileName: { contains: search } } : {};

  const [total, media] = await Promise.all([
    prisma.media.count({ where }),
    prisma.media.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: UPLOADER_SELECT,
    }),
  ]);

  return {
    data: media,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function create(file, body, admin, req) {
  if (!file) {
    throw new ValidationError("An image file is required.");
  }

  const altText = typeof body?.altText === "string" ? body.altText.trim() : "";

  return prisma.media.create({
    data: {
      fileUrl: toPublicUrl(req, file.filename),
      fileName: file.filename,
      altText: altText || null,
      uploadedBy: admin?.id ?? null,
    },
    include: UPLOADER_SELECT,
  });
}

async function getById(rawId) {
  const id = parseId(rawId);
  const media = await prisma.media.findUnique({ where: { id }, include: UPLOADER_SELECT });
  if (!media) {
    throw new NotFoundError("Media not found.");
  }
  return media;
}

async function update(rawId, body) {
  const id = parseId(rawId);

  const existing = await prisma.media.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Media not found.");
  }

  const data = parseMediaUpdateInput(body);
  return prisma.media.update({ where: { id }, data, include: UPLOADER_SELECT });
}

async function remove(rawId) {
  const id = parseId(rawId);

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) {
    throw new NotFoundError("Media not found.");
  }

  // DB delete first: if this throws, nothing else happens and no file is
  // touched — the record and the file stay consistent with each other.
  await prisma.media.delete({ where: { id } });

  // The on-disk path is derived only from the value WE generated and
  // stored at upload time (middleware/upload.js's filename callback) —
  // never from anything a client sends on this request — so a client can
  // never direct this at an arbitrary filesystem path. path.resolve +
  // startsWith is a defense-in-depth check on top of that, not the only
  // thing preventing traversal.
  const filePath = path.resolve(UPLOADS_DIR, media.fileName);
  if (!filePath.startsWith(path.resolve(UPLOADS_DIR) + path.sep)) {
    console.error(`Refusing to delete a file outside the uploads directory for media ${id}: ${filePath}`);
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (err) {
    // The DB record is already gone either way — a failure here only
    // leaves an orphaned, unreferenced file on disk (a minor cleanup
    // concern), not a broken/dangling reference anyone will encounter.
    if (err.code !== "ENOENT") {
      console.error(`Failed to delete uploaded file for media ${id} (${filePath}):`, err);
    }
  }
}

module.exports = { list, create, getById, update, remove };
