const { prisma } = require("../config/prisma");
const { LAYOUT_KEYS, WIDGET_KEYS, defaultRows } = require("../config/sidebarWidgets");
const { parseSidebarLayoutInput } = require("../utils/validation/sidebar");
const { ValidationError } = require("../utils/errors");

// Safety net (same idea as settings.service.getOrCreate): if the table is
// empty — e.g. a database migrated but never seeded — populate it from the
// code defaults so the public sidebar is never blank.
async function ensureSeeded() {
  const count = await prisma.sidebarWidgetSetting.count();
  if (count > 0) return;
  await prisma.sidebarWidgetSetting.createMany({ data: defaultRows() });
}

// Returns { [layout]: [{ widgetKey, enabled }] } for every known layout, in
// stored order. Rows for unknown layouts / widget keys (left over from a
// renamed registry entry) are ignored so the frontend only ever sees valid
// keys.
async function getConfig() {
  await ensureSeeded();
  const rows = await prisma.sidebarWidgetSetting.findMany({
    orderBy: [{ layout: "asc" }, { sortOrder: "asc" }],
  });

  const config = {};
  for (const layout of LAYOUT_KEYS) config[layout] = [];
  for (const row of rows) {
    if (!config[row.layout]) continue;
    if (!WIDGET_KEYS.includes(row.widgetKey)) continue;
    config[row.layout].push({ widgetKey: row.widgetKey, enabled: row.enabled });
  }
  return config;
}

// Replaces the full widget list for ONE layout in a transaction: delete its
// rows, recreate from `items` (array index -> sortOrder). Other layouts are
// untouched.
async function replaceLayout(rawLayout, body) {
  const layout = typeof rawLayout === "string" ? rawLayout.trim() : "";
  if (!LAYOUT_KEYS.includes(layout)) {
    throw new ValidationError(`Unknown sidebar layout "${layout}".`);
  }
  const items = parseSidebarLayoutInput(body);

  await prisma.$transaction([
    prisma.sidebarWidgetSetting.deleteMany({ where: { layout } }),
    prisma.sidebarWidgetSetting.createMany({
      data: items.map((item, index) => ({
        layout,
        widgetKey: item.widgetKey,
        enabled: item.enabled,
        sortOrder: index,
      })),
    }),
  ]);

  return getConfig();
}

module.exports = { getConfig, replaceLayout, ensureSeeded };
