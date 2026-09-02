const { prisma } = require("../config/prisma");
const { NotFoundError, ValidationError } = require("../utils/errors");

// Admin read/moderate for Contact + Work With Me enquiries (Phase 4). Public
// submission (creation) lives separately in services/contact.service.js —
// enquiries are never created here.

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function clampInt(raw, fallback, min, max) {
  if (raw === null || raw === undefined || raw === "") return fallback;
  const num = Number(raw);
  if (!Number.isInteger(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError("Invalid message id.");
  return id;
}

async function list(query) {
  const page = clampInt(query.page, 1, 1, 1_000_000);
  const limit = clampInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const where = {};
  if (query.handled === "true") where.handled = true;
  if (query.handled === "false") where.handled = false;
  if (query.topic === "contact" || query.topic === "work_with_me") where.topic = query.topic;

  const [total, data] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function setHandled(rawId, body) {
  const id = parseId(rawId);
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Message not found.");
  const handled = body?.handled === true || body?.handled === "true";
  return prisma.contactMessage.update({ where: { id }, data: { handled } });
}

async function remove(rawId) {
  const id = parseId(rawId);
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Message not found.");
  await prisma.contactMessage.delete({ where: { id } });
}

module.exports = { list, setHandled, remove };
