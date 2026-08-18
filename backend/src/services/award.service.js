const { prisma } = require("../config/prisma");
const { parseAwardInput } = require("../utils/validation/awards");
const { NotFoundError, ValidationError } = require("../utils/errors");

async function list() {
  // Award has no dedicated ordering field — newest-first is the
  // predictable, stable default, same choice as Books. Unlike
  // Posts/Pages/Books, Award has no large content field to strip from the
  // list, so list and detail return the same shape.
  return prisma.award.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
}

async function create(body) {
  const data = parseAwardInput(body, "create");
  // No unique constraint exists on Award in the locked schema — there is
  // no duplicate/conflict scenario to guard against here.
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
