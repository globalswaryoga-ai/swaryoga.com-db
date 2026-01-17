/**
 * Rate Limiting Middleware
 * Protects APIs from brute force and DDoS attacks
 */

import type { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

// Clean old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later',
    keyGenerator = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Initialize or reset entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    store[key].count++;

    // Add rate limit headers
    const remaining = Math.max(0, max - store[key].count);
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', Math.ceil(store[key].resetTime / 1000));

    // Check if limit exceeded
    if (store[key].count > max) {
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

// Pre-configured limiters
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth attempts per window
  keyGenerator: (req) => {
    // Use email or phone for auth endpoints
    const email = req.body?.email || req.body?.phone || req.ip || 'unknown';
    return `auth:${email}`;
  },
});

export const paymentLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 payment attempts per minute
  keyGenerator: (req) => {
    const userId = req.body?.userId || req.query?.userId || req.ip || 'unknown';
    return `payment:${userId}`;
  },
});

export const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 webhook calls per minute
  keyGenerator: (req) => {
    // Use source header or IP
    const source = req.headers['x-webhook-source'] || req.ip || 'unknown';
    return `webhook:${source}`;
  },
});

// Brute force protection for failed logins
export function createBruteForceProtector(
  maxAttempts: number = 5,
  lockoutDuration: number = 15 * 60 * 1000
) {
  const attempts: { [key: string]: { count: number; lockedUntil: number } } = {};

  return {
    check: (identifier: string): { allowed: boolean; remainingAttempts: number } => {
      const now = Date.now();
      const record = attempts[identifier];

      if (!record) {
        return { allowed: true, remainingAttempts: maxAttempts };
      }

      if (record.lockedUntil > now) {
        return { allowed: false, remainingAttempts: 0 };
      }

      // Reset if lock expired
      if (record.lockedUntil < now) {
        delete attempts[identifier];
        return { allowed: true, remainingAttempts: maxAttempts };
      }

      return {
        allowed: record.count < maxAttempts,
        remainingAttempts: Math.max(0, maxAttempts - record.count),
      };
    },

    record: (identifier: string, success: boolean) => {
      const now = Date.now();

      if (!attempts[identifier]) {
        attempts[identifier] = { count: 0, lockedUntil: 0 };
      }

      if (success) {
        delete attempts[identifier];
      } else {
        attempts[identifier].count++;

        if (attempts[identifier].count >= maxAttempts) {
          attempts[identifier].lockedUntil = now + lockoutDuration;
        }
      }
    },

    reset: (identifier: string) => {
      delete attempts[identifier];
    },
  };
}

export const loginProtector = createBruteForceProtector(5, 15 * 60 * 1000);

// API usage metrics for monitoring
export function createMetricsCollector() {
  const metrics = {
    endpoints: {} as {
      [path: string]: { requests: number; errors: number; avgTime: number };
    },
    errors: {} as { [error: string]: number },
    lastReset: Date.now(),
  };

  return {
    record: (
      path: string,
      statusCode: number,
      responseTime: number
    ) => {
      if (!metrics.endpoints[path]) {
        metrics.endpoints[path] = {
          requests: 0,
          errors: 0,
          avgTime: 0,
        };
      }

      const endpoint = metrics.endpoints[path];
      const totalTime = endpoint.avgTime * endpoint.requests;
      endpoint.requests++;
      endpoint.avgTime = (totalTime + responseTime) / endpoint.requests;

      if (statusCode >= 400) {
        endpoint.errors++;
        metrics.errors[`${path}:${statusCode}`] =
          (metrics.errors[`${path}:${statusCode}`] || 0) + 1;
      }
    },

    getMetrics: () => metrics,

    reset: () => {
      metrics.endpoints = {};
      metrics.errors = {};
      metrics.lastReset = Date.now();
    },
  };
}

export const metricsCollector = createMetricsCollector();
