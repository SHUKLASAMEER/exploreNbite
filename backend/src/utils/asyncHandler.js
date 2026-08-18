// Express 4 does not automatically catch rejected promises from an async
// route handler — an unhandled rejection would otherwise just hang the
// request or crash the process. Wrapping every controller in this forwards
// any thrown/rejected error to the centralized error-handling middleware
// (middleware/errorHandler.js), which is what actually turns AppError
// subclasses and Prisma errors into the right HTTP response. This is a tiny
// local utility, not a new dependency (e.g. express-async-errors).
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
