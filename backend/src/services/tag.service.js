const { prisma } = require("../config/prisma");

// Read-only, just enough for the post editor's tag picker to suggest
// existing tags. Not a Tags admin module — no create/update/delete here
// (tags are created via the post service, see utils/validation/posts.js#resolveTagIds).
async function list() {
  return prisma.tag.findMany({ orderBy: { name: "asc" } });
}

module.exports = { list };
