/**
 * Global Error Handler Middleware
 * --------------------------------
 * This is the LAST middleware in the Express chain.
 * It catches every error — both our typed AppErrors and unexpected ones.
 *
 * Why this is break-proof:
 *   - AppError subclasses carry their own status code → clean mapping
 *   - Unknown errors always return 500 (never leaks stack traces)
 *   - Malformed JSON bodies (SyntaxError from express.json()) → 400
 *   - Logs the real error for debugging, hides internals from the client
 *   - Prevents the process from crashing on unhandled route errors
 */

import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // --- Malformed JSON body (from express.json()) ---
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      error: "Malformed JSON in request body.",
    });
    return;
  }

  // --- Our typed application errors (BadRequest, NotFound, Conflict, etc.) ---
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // --- Unexpected / unknown errors → always 500 ---
  console.error("[UNEXPECTED ERROR]", err);
  res.status(500).json({
    error: "Internal server error.",
  });
};
