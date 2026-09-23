// Ported from the Next.js app's lib/api/errors.js — same class hierarchy,
// same delivery contract (statusCode + code), unchanged.

class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

class ValidationError extends AppError {
  constructor(message = "Invalid request data") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

class ConflictError extends AppError {
  constructor(message = "Conflicting request") {
    super(message, 409, "CONFLICT");
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

// AI SEO Suggestions: no provider is configured/implemented yet (see
// services/ai/provider.js). 503 — the feature is temporarily/structurally
// unavailable, not a client mistake.
class AiUnavailableError extends AppError {
  constructor(message = "AI suggestions are not available right now.") {
    super(message, 503, "AI_UNAVAILABLE");
  }
}

// The provider returned something that didn't pass structural validation
// (wrong types, missing fields, etc). Never exposes the raw provider output.
class AiResponseError extends AppError {
  constructor(message = "The AI response could not be validated.") {
    super(message, 502, "AI_INVALID_RESPONSE");
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  AiUnavailableError,
  AiResponseError,
};
