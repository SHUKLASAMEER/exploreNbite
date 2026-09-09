const { prisma } = require("../config/prisma");
const { parseAwardInput, EXCLUSIVE_BADGE_SLOTS } = require("../utils/validation/awards");
const { NotFoundError, ValidationError } = require("../utils/errors");

// award_photo / tripoto / indiblogger hold exactly one award each. If `data`
// assigns one of those slots, make sure no other award already occupies it —
// otherwise two awards would silently fight over the same sidebar badge.
async function assertBadgeSlotFree(data, currentId) {
  if (!data.badgeSlot || !EXCLUSIVE_BADGE_SLOTS.includes(data.badgeSlot)) return;
  const holder = await prisma.award.findFirst({
    where: { badgeSlot: data.badgeSlot, ...(currentId ? { NOT: { id: currentId } } : {}) },
  });
  if (holder) {
    throw new ValidationError(
      `The "${data.badgeSlot}" badge slot is already assigned to "${holder.title}". Clear it there first.`
    );
  }
}

async function list() {
  // Award has no dedicated ordering field — newest-first is the
  // predictable, stable default, same choice as Books. Unlike
  // Posts/Pages/Books, Award has no large content field to strip from the
  // list, so list and detail return the same shape.
  return prisma.award.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
}

async function create(body) {
  const data = parseAwardInput(body, "create");
  await assertBadgeSlotFree(data, null);
  return prisma.award.create({ data });
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid award id.");
  }
  return id;
}

async function getById(rawId) {
  const id = parseId(rawId);
  const award = await prisma.award.findUnique({ where: { id } });
  if (!award) {
    throw new NotFoundError("Award not found.");
  }
  return award;
}

async function update(rawId, body) {
  const id = parseId(rawId);

  const existingAward = await prisma.award.findUnique({ where: { id } });
  if (!existingAward) {
    throw new NotFoundError("Award not found.");
  }

  const data = parseAwardInput(body, "update");
  await assertBadgeSlotFree(data, id);
  return prisma.award.update({ where: { id }, data });
}

async function remove(rawId) {
  const id = parseId(rawId);

  const award = await prisma.award.findUnique({ where: { id } });
  if (!award) {
    throw new NotFoundError("Award not found.");
  }

  // Award has no relations in the schema — nothing else references
  // awards.id, so deleting it can never orphan or cascade into anything.
  await prisma.award.delete({ where: { id } });
}

module.exports = { list, create, getById, update, remove };
