// lib/security/rateLimit.ts
// Advanced rate limiting with per-route configuration

import type { NextRequest } from 'next/server';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

class RateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => `${req.ip}-${req.nextUrl.pathname}`,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };
  }

  check(req: NextRequest): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.config.keyGenerator?.(req) || 'default';
    const now = Date.now();
    const entry = this.store.get(key);

    // Create new entry if doesn't exist
    if (!entry || now > entry.resetTime) {
      const newEntry = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      this.store.set(key, newEntry);
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    // Increment existing entry
    entry.count++;
    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Pre-configured limiters
export const limits = {
  // Public endpoints: 100 requests per 15 minutes
  public: new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  }),

  // Login/Auth: 5 requests per 15 minutes
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  }),

  // Payment: 10 requests per hour
  payment: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
  }),

  // API calls: 50 requests per minute (authenticated)
  api: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 50,
  }),

  // Admin: 200 requests per minute
  admin: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 200,
  }),
};

// Cleanup old entries every 5 minutes
setInterval(() => {
  Object.values(limits).forEach((limiter) => limiter.cleanup());
}, 5 * 60 * 1000);

export default RateLimiter;
