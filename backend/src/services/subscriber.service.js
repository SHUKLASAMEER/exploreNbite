const { prisma } = require("../config/prisma");
const { parseSubscriberInput } = require("../utils/validation/subscribers");
const { NotFoundError, ValidationError, ConflictError } = require("../utils/errors");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Number(null) === 0 and Number("") === 0, both of which pass
// Number.isInteger() — without this check an omitted query param would
// silently clamp to `min` instead of using `fallback` (same fix already
// applied to Posts/Comments list endpoints).
function clampInt(raw, fallback, min, max) {
  if (raw === null || raw === undefined || raw === "") return fallback;
  const num = Number(raw);
  if (!Number.isInteger(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid subscriber id.");
  }
  return id;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

async function subscribe(body) {
  const { email } = parseSubscriberInput(body);

  const existing = await prisma.subscriber.findUnique({ where: { email } });
  if (existing) {
    // A specific, human message rather than the generic P2002 fallback in
    // middleware/errorHandler.js — same "pre-check for a clear message,
    // let the DB unique constraint be the race-condition safety net"
    // pattern already used for Category/Post/Page slugs.
    throw new ConflictError("This email is already subscribed.");
  }

  // status/subscribedAt come entirely from the schema's own defaults
  // (active / now()) — never from the request body. No other field on
  // this model exists to invent.
  return prisma.subscriber.create({
    data: { email },
    select: { id: true, email: true, status: true, subscribedAt: true },
  });
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

async function list(query) {
  const page = clampInt(query.page, 1, 1, 1_000_000);
  const limit = clampInt(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const search = typeof query.search === "string" ? query.search.trim() : "";

  const where = {};
  if (search) {
    // MySQL's default collation (utf8mb4_*_ci) is case-insensitive — same
    // precedent as every other search in this project.
    where.email = { contains: search };
  }

  const [total, subscribers] = await Promise.all([
    prisma.subscriber.count({ where }),
    prisma.subscriber.findMany({
      where,
      orderBy: [{ subscribedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data: subscribers,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getById(rawId) {
  const id = parseId(rawId);
  const subscriber = await prisma.subscriber.findUnique({ where: { id } });
  if (!subscriber) {
    throw new NotFoundError("Subscriber not found.");
  }
  return subscriber;
}

async function remove(rawId) {
  const id = parseId(rawId);

  const subscriber = await prisma.subscriber.findUnique({ where: { id } });
  if (!subscriber) {
    throw new NotFoundError("Subscriber not found.");
  }

  // Subscriber has no relations in the schema — deleting one can never
  // affect any other subscriber or unrelated record.
  await prisma.subscriber.delete({ where: { id } });
}

module.exports = { subscribe, list, getById, remove };
