const { prisma } = require("../config/prisma");
const { parseTagName } = require("../utils/validation/posts");
const { ValidationError } = require("../utils/errors");

// Read + explicit create, just enough for the post editor's tag picker.
// Still not a full Tags admin module — no update/delete here (tag records
// are never renamed, see the schema note and resolveTagIds).
async function list() {
  return prisma.tag.findMany({ orderBy: { name: "asc" } });
}

// Create a tag on an explicit admin action (the post editor's "create tag"
// buttons / manual add). Find-or-create keyed on the unique slug — the same
// rule resolveTagIds uses when a post save introduces a new tag — so this
// can never produce a duplicate or a near-duplicate differing only by case
// or whitespace, and it returns the existing record untouched when one
// already matches (never renaming it).
async function create(rawName) {
  const parsed = parseTagName(rawName);
  if (!parsed) {
    throw new ValidationError("A tag name with at least one letter or number is required.");
  }
  return prisma.tag.upsert({
    where: { slug: parsed.slug },
    update: {},
    create: { name: parsed.name, slug: parsed.slug },
  });
}

module.exports = { list, create };
