/**
 * Validation Middleware
 * ----------------------
 * Validates and sanitizes incoming request data BEFORE it reaches controllers.
 * This is the first line of defense against:
 *   - XSS / injection attacks (HTML tags, script tags stripped)
 *   - Invalid email formats
 *   - Excessively long strings (name/email length caps)
 *   - Invalid UUID formats in :id params
 *   - Extra/unexpected fields in the body (stripped out)
 *
 * Each validator returns a middleware function compatible with Express.
 */

import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../errors/AppError";

// ---------------------------------------------------------------------------
// Constants — single source of truth for limits
// ---------------------------------------------------------------------------

/** Maximum characters allowed for the name field */
const MAX_NAME_LENGTH = 100;

/** Maximum characters allowed for the email field */
const MAX_EMAIL_LENGTH = 254; // RFC 5321 max

/** Regex for a valid UUID v4 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Simple but effective email regex.
 * Validates: local@domain.tld  (at least 2-char TLD)
 * Rejects:   spaces, missing @, missing domain, etc.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags and trim whitespace to prevent XSS.
 * This is a defense-in-depth measure (APIs should also escape on output).
 */
const sanitize = (input: string): string =>
  input.replace(/<[^>]*>/g, "").trim();

/**
 * Validate that a value is a non-empty string after sanitization.
 * Returns the sanitized value or null.
 */
const cleanString = (
  value: unknown,
  maxLength: number
): string | null => {
  if (typeof value !== "string") return null;
  const cleaned = sanitize(value);
  if (cleaned.length === 0 || cleaned.length > maxLength) return null;
  return cleaned;
};

// ---------------------------------------------------------------------------
// Middleware: Validate Create User body
// ---------------------------------------------------------------------------

/**
 * Validates POST /api/users body.
 * Ensures name and email are present, properly typed, sanitized,
 * within length limits, and email matches a valid format.
 * Strips any extra fields (only name & email pass through).
 */
export const validateCreateUser = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { name, email } = req.body ?? {};

  const cleanName = cleanString(name, MAX_NAME_LENGTH);
  if (!cleanName) {
    throw new BadRequestError(
      `'name' is required and must be a non-empty string (max ${MAX_NAME_LENGTH} chars).`
    );
  }

  const cleanEmail = cleanString(email, MAX_EMAIL_LENGTH);
  if (!cleanEmail) {
    throw new BadRequestError(
      `'email' is required and must be a non-empty string (max ${MAX_EMAIL_LENGTH} chars).`
    );
  }

  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new BadRequestError(
      `'email' must be a valid email address (got "${cleanEmail}").`
    );
  }

  // Overwrite body with ONLY the sanitized fields (strip extras)
  req.body = { name: cleanName, email: cleanEmail.toLowerCase() };
  next();
};

// ---------------------------------------------------------------------------
// Middleware: Validate Update User body
// ---------------------------------------------------------------------------

/**
 * Validates PUT /api/users/:id body.
 * At least one of name or email must be provided.
 * Same sanitization and format checks as create.
 */
export const validateUpdateUser = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { name, email } = req.body ?? {};
  const sanitized: Record<string, string> = {};

  if (name !== undefined) {
    const cleanName = cleanString(name, MAX_NAME_LENGTH);
    if (!cleanName) {
      throw new BadRequestError(
        `'name' must be a non-empty string (max ${MAX_NAME_LENGTH} chars).`
      );
    }
    sanitized.name = cleanName;
  }

  if (email !== undefined) {
    const cleanEmail = cleanString(email, MAX_EMAIL_LENGTH);
    if (!cleanEmail) {
      throw new BadRequestError(
        `'email' must be a non-empty string (max ${MAX_EMAIL_LENGTH} chars).`
      );
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      throw new BadRequestError(
        `'email' must be a valid email address (got "${cleanEmail}").`
      );
    }
    sanitized.email = cleanEmail.toLowerCase();
  }

  if (Object.keys(sanitized).length === 0) {
    throw new BadRequestError(
      "Provide at least 'name' or 'email' to update."
    );
  }

  // Overwrite body with ONLY the sanitized fields
  req.body = sanitized;
  next();
};

// ---------------------------------------------------------------------------
// Middleware: Validate :id param is a valid UUID v4
// ---------------------------------------------------------------------------

/**
 * Rejects requests with malformed UUIDs early,
 * before hitting the service layer.
 */
export const validateIdParam = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { id } = req.params;

  if (!id || !UUID_V4_REGEX.test(id)) {
    throw new BadRequestError(
      `'id' must be a valid UUID v4 (got "${id}").`
    );
  }

  next();
};
