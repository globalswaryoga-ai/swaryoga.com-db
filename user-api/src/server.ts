/**
 * Server Entry Point — Hardened
 * --------------------------------
 * Bootstraps the Express application with full production-grade protections:
 *
 *   1. Body size limit (prevents payload attacks)
 *   2. CORS headers (configurable origin control)
 *   3. Security headers (X-Content-Type-Options, etc.)
 *   4. Rate limiting (prevents DDoS / brute force)
 *   5. Request logging (visibility into all traffic)
 *   6. Validation middleware on every route
 *   7. Global error handler (catches everything, never crashes)
 *   8. 404 catch-all (unknown routes get a proper JSON error)
 *   9. Graceful shutdown (in-flight requests finish before exit)
 *  10. Unhandled rejection/exception catchers (last-resort safety net)
 */

import express, { Request, Response } from "express";
import userRoutes from "./routes/user.routes";
import { globalErrorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { requestLogger } from "./middleware/requestLogger";

// Create the Express app
const app = express();

// Port — use the PORT env variable or default to 3000
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// 1. Security Headers
// ---------------------------------------------------------------------------

app.use((_req, res, next) => {
  // Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Prevent click-jacking
  res.setHeader("X-Frame-Options", "DENY");
  // Hide server software info
  res.removeHeader("X-Powered-By");
  next();
});

// ---------------------------------------------------------------------------
// 2. CORS — Allow all origins for dev; restrict in production via env var
// ---------------------------------------------------------------------------

app.use((_req, res, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  // Handle preflight
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// ---------------------------------------------------------------------------
// 3. Body Parser with Size Limit (reject payloads > 100kb)
// ---------------------------------------------------------------------------

app.use(express.json({ limit: "100kb" }));

// ---------------------------------------------------------------------------
// 4. Request Logger
// ---------------------------------------------------------------------------

app.use(requestLogger);

// ---------------------------------------------------------------------------
// 5. Rate Limiter — 100 requests per 60 seconds per IP
// ---------------------------------------------------------------------------

app.use(rateLimiter({ windowMs: 60_000, maxRequests: 100 }));

// ---------------------------------------------------------------------------
// 6. Routes
// ---------------------------------------------------------------------------

// Health-check / welcome route
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "User API is running 🚀",
    version: "2.0.0",
    endpoints: {
      "POST   /api/users":      "Create a user",
      "GET    /api/users":      "List all users",
      "GET    /api/users/:id":  "Get user by id",
      "PUT    /api/users/:id":  "Update user",
      "DELETE /api/users/:id":  "Delete user",
    },
  });
});

// Mount user CRUD routes (with validation middleware applied per-route)
app.use("/api/users", userRoutes);

// ---------------------------------------------------------------------------
// 7. 404 Catch-All — Unknown routes get a proper JSON error
// ---------------------------------------------------------------------------

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found." });
});

// ---------------------------------------------------------------------------
// 8. Global Error Handler — MUST be the last app.use()
// ---------------------------------------------------------------------------

app.use(globalErrorHandler);

// ---------------------------------------------------------------------------
// 9. Start Server with Graceful Shutdown
// ---------------------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
  console.log(`📚 API base path: http://localhost:${PORT}/api/users`);
});

/**
 * Graceful shutdown: when the process receives SIGTERM or SIGINT,
 * stop accepting new connections and let in-flight requests finish
 * before exiting. This prevents dropped requests during deployments.
 */
const gracefulShutdown = (signal: string) => {
  console.log(`\n⏳ Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log("✅ Server closed. All connections drained.");
    process.exit(0);
  });

  // Force exit after 10 seconds if connections won't close
  setTimeout(() => {
    console.error("⚠️ Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ---------------------------------------------------------------------------
// 10. Last-Resort Safety Nets — prevent process crashes
// ---------------------------------------------------------------------------

process.on("unhandledRejection", (reason: unknown) => {
  console.error("[UNHANDLED REJECTION]", reason);
  // Don't crash — log and continue
});

process.on("uncaughtException", (err: Error) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
  // Crash after logging — uncaught exceptions leave the process in an
  // undefined state, so it's safer to restart
  gracefulShutdown("uncaughtException");
});
