/**
 * Rate Limiter Middleware
 * ------------------------
 * Simple in-memory sliding-window rate limiter.
 * No external dependencies needed.
 *
 * Protection against:
 *   - DDoS / brute-force attacks
 *   - Accidental infinite loops from client code
 *   - Runaway scripts hammering the API
 *
 * How it works:
 *   - Tracks request timestamps per IP in a Map
 *   - Each request cleans up expired entries (sliding window)
 *   - If count within window exceeds the limit → 429 Too Many Requests
 *   - Map entries are auto-cleaned to prevent memory leaks
 */

import { Request, Response, NextFunction } from "express";

interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Max requests allowed per IP within the window */
  maxRequests: number;
}

/** Store: IP → array of request timestamps */
const ipRequestMap = new Map<string, number[]>();

/** Periodically clean up stale entries to prevent unbounded memory growth */
const CLEANUP_INTERVAL_MS = 60_000; // every 60 seconds

setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipRequestMap.entries()) {
    // Remove IPs that haven't made requests recently
    const fresh = timestamps.filter((t) => now - t < 120_000);
    if (fresh.length === 0) {
      ipRequestMap.delete(ip);
    } else {
      ipRequestMap.set(ip, fresh);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Creates a rate-limiting middleware with the given config.
 * Default: 100 requests per 60 seconds per IP.
 */
export const rateLimiter = (
  config: RateLimitConfig = { windowMs: 60_000, maxRequests: 100 }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    // Get existing timestamps or start fresh
    const timestamps = ipRequestMap.get(ip) || [];

    // Remove timestamps outside the current window (sliding window)
    const windowStart = now - config.windowMs;
    const recentTimestamps = timestamps.filter((t) => t > windowStart);

    if (recentTimestamps.length >= config.maxRequests) {
      // Calculate when the client can retry
      const oldestInWindow = recentTimestamps[0];
      const retryAfterMs = config.windowMs - (now - oldestInWindow);
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);

      res.set("Retry-After", String(retryAfterSec));
      res.status(429).json({
        error: "Too many requests. Please slow down.",
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    // Record this request
    recentTimestamps.push(now);
    ipRequestMap.set(ip, recentTimestamps);

    // Add rate-limit headers so clients can self-throttle
    res.set("X-RateLimit-Limit", String(config.maxRequests));
    res.set(
      "X-RateLimit-Remaining",
      String(config.maxRequests - recentTimestamps.length)
    );

    next();
  };
};
