// Typed errors for app/api/** route handlers, adapted from the Phase 2A
// Express middleware (backend/src/middleware/AppError.ts). The class
// hierarchy is unchanged; only the delivery mechanism changes, since Next.js
// Route Handlers have no centralized error-handling middleware chain — each
// route calls handleApiError(err) itself (typically from a catch block).

export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request data") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflicting request") {
    super(message, 409, "CONFLICT");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}
