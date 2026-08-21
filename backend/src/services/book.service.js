const { prisma } = require("../config/prisma");
const { parseBookInput, parseBuyLinks } = require("../utils/validation/books");
const { NotFoundError, ValidationError } = require("../utils/errors");

const BOOK_INCLUDE = { buyLinks: { orderBy: { sortOrder: "asc" } } };

function toPublicBookListItem(book) {
  const { _count, ...rest } = book;
  return { ...rest, buyLinkCount: _count.buyLinks };
}

async function list() {
  // Books has no dedicated ordering field of its own — newest-first is the
  // predictable, stable default, same as Posts.
  const books = await prisma.book.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      coverImageUrl: true,
      publishedYear: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { buyLinks: true } },
      // description and full buyLinks intentionally excluded — the admin
      // list only needs a count, not the full rows
    },
  });
  return books.map(toPublicBookListItem);
}

// Public — no req.admin available here. Unlike list() (the admin list view,
// which strips description/buyLinks down to a count since the admin table
// doesn't need them), the public books page wants the full row — including
// buy links — so it can render "Buy on ..." links directly on each card
// without a second request per book.
async function listPublic() {
  return prisma.book.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: BOOK_INCLUDE,
  });
}

async function create(body) {
  const data = parseBookInput(body, "create");
  const buyLinks = parseBuyLinks(body?.buyLinks) ?? [];

  return prisma.book.create({
    data: {
      ...data,
      buyLinks: { create: buyLinks },
    },
    include: BOOK_INCLUDE,
  });
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Invalid book id.");
  }
  return id;
}

async function getById(rawId) {
  const id = parseId(rawId);
  const book = await prisma.book.findUnique({ where: { id }, include: BOOK_INCLUDE });
  if (!book) {
    throw new NotFoundError("Book not found.");
  }
  return book;
}

async function update(rawId, body) {
  const id = parseId(rawId);

  const existingBook = await prisma.book.findUnique({ where: { id } });
  if (!existingBook) {
    throw new NotFoundError("Book not found.");
  }

  const data = parseBookInput(body, "update");

  const hasBuyLinks = Object.prototype.hasOwnProperty.call(body ?? {}, "buyLinks");
  const buyLinks = hasBuyLinks ? parseBuyLinks(body.buyLinks) : undefined;

  const operations = [prisma.book.update({ where: { id }, data })];
  if (hasBuyLinks) {
    // Delete-then-recreate — same pattern used for Post <-> Tag sync:
    // guarantees no stale BookBuyLink rows survive an edit. Nothing else
    // references book_buy_links.id, so reissuing fresh rows for the whole
    // submitted set has no downside beyond the row ids themselves changing.
    operations.push(prisma.bookBuyLink.deleteMany({ where: { bookId: id } }));
    for (const link of buyLinks) {
      operations.push(prisma.bookBuyLink.create({ data: { bookId: id, ...link } }));
    }
  }
  await prisma.$transaction(operations);

  return prisma.book.findUnique({ where: { id }, include: BOOK_INCLUDE });
}

async function remove(rawId) {
  const id = parseId(rawId);

  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    throw new NotFoundError("Book not found.");
  }

  // BookBuyLink.bookId is `onDelete: Cascade` in the schema — deleting the
  // book removes its own buy links automatically, no orphans. No other
  // table references books.id.
  await prisma.book.delete({ where: { id } });
}

module.exports = { list, listPublic, create, getById, update, remove };
