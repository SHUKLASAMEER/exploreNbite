const { Prisma } = require("@prisma/client");
const { AppError } = require("../utils/errors");

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}`, code: "ROUTE_NOT_FOUND" },
  });
}

// Centralized Express error-handling middleware (4-arg signature is what
// makes Express treat this as an error handler). Ported from the Next.js
// app's lib/api/response.js#handleApiError — same classification, same
// { error: { message, code } } response shape, same Prisma error-code
// mapping — only the delivery mechanism changes (one middleware instead of
// a per-route catch-block call).
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { message: err.message, code: err.code } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ error: { message: "A record with this value already exists.", code: "UNIQUE_CONSTRAINT" } });
    }
    if (err.code === "P2003") {
      return res
        .status(400)
        .json({ error: { message: "Referenced record does not exist.", code: "FOREIGN_KEY_CONSTRAINT" } });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: { message: "Record not found.", code: "NOT_FOUND" } });
    }
  }

  console.error(err);
  res.status(500).json({ error: { message: "Internal server error.", code: "INTERNAL_ERROR" } });
}

module.exports = { notFoundHandler, errorHandler };
