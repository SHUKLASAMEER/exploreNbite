const { prisma } = require("../config/prisma");
const { parseSettingsInput } = require("../utils/validation/settings");

const SETTINGS_ID = 1;

// Settings is a locked-schema singleton (id always 1, see
// prisma/schema.prisma) — no list/create/delete, only get + update. The row
// is created once by prisma/seed.js; getOrCreate() below is just a safety
// net (e.g. a from-scratch database that was migrated but never seeded) so
// the admin UI always has something to load rather than a raw 404.
async function getOrCreate() {
  const existing = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;

  return prisma.settings.create({
    data: {
      id: SETTINGS_ID,
      siteTitle: "Explore N Bite",
      contactEmail: "admin@explorenbite.local",
    },
  });
}

async function update(body) {
  const data = parseSettingsInput(body);
  await getOrCreate(); // ensures the row exists before the update below
  return prisma.settings.update({ where: { id: SETTINGS_ID }, data });
}

module.exports = { get: getOrCreate, update };
