/**
 * Request Logger Middleware
 * --------------------------
 * Logs every incoming request with method, path, status code,
 * and response time. Essential for debugging and monitoring.
 *
 * Output format:  [2026-03-06T10:30:00.000Z] POST /api/users → 201 (12ms)
 */

import { Request, Response, NextFunction } from "express";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  // Hook into the response finish event to log after the response is sent
  res.on("finish", () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
    );
  });

  next();
};
