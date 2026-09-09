const { ValidationError } = require("../errors");
const { WIDGET_KEYS } = require("../../config/sidebarWidgets");

// Parses the body of PATCH /api/admin/sidebar/:layout — expects
// { widgets: [{ widgetKey, enabled }, ...] }. Order in the array IS the
// display order. Every widgetKey must be a known registry key and must not
// repeat within the layout.
function parseSidebarLayoutInput(body) {
  const input = body && typeof body === "object" ? body : {};
  const raw = Array.isArray(input.widgets) ? input.widgets : null;
  if (!raw) {
    throw new ValidationError("`widgets` must be an array.");
  }

  const seen = new Set();
  const items = raw.map((entry) => {
    const widgetKey = entry && typeof entry.widgetKey === "string" ? entry.widgetKey.trim() : "";
    if (!WIDGET_KEYS.includes(widgetKey)) {
      throw new ValidationError(`Unknown sidebar widget "${widgetKey}".`);
    }
    if (seen.has(widgetKey)) {
      throw new ValidationError(`Widget "${widgetKey}" is listed more than once.`);
    }
    seen.add(widgetKey);
    return { widgetKey, enabled: entry.enabled !== false };
  });

  return items;
}

module.exports = { parseSidebarLayoutInput };
