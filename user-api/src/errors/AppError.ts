/**
 * Custom Error Classes
 * ---------------------
 * Typed errors so the global error handler can map them
 * to the correct HTTP status code automatically.
 * This prevents code-breakage from untyped string matching.
 */

/**
 * Base class for all application errors.
 * Carries an HTTP status code so the error handler knows
 * exactly which status to return — no string matching needed.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Preserve the correct prototype chain (required for instanceof checks in TS)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 — Client sent invalid data */
export class BadRequestError extends AppError {
  constructor(message = "Bad request.") {
    super(message, 400);
  }
}

/** 404 — Resource not found */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" not found.`, 404);
  }
}

/** 409 — Conflict (e.g. duplicate email) */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

/** 429 — Too many requests */
export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests. Please slow down.") {
    super(message, 429);
  }
}

/** 503 — Service unavailable (e.g. store full) */
export class ServiceUnavailableError extends AppError {
  constructor(message = "Service temporarily unavailable.") {
    super(message, 503);
  }
}
