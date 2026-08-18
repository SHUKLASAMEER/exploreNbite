const { prisma } = require("../config/prisma");

// Read-only, just enough for the post editor's author picker. Not an
// Authors admin module — no create/update/delete here.
async function list() {
  return prisma.author.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

module.exports = { list };
