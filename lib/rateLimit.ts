// lib/rateLimit.ts
// Rate limiting middleware for API endpoints

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds (default: 60 seconds)
  max?: number; // Max requests per window (default: 30)
  keyGenerator?: (ip: string) => string;
}

/**
 * Check if request is within rate limit
 * @param ip IP address or identifier
 * @param options Rate limit options
 * @returns true if request is allowed, false if rate limited
 */
export function isRateLimited(
  ip: string,
  options: RateLimitOptions = {}
): boolean {
  const windowMs = options.windowMs || 60000; // 1 minute default
  const max = options.max || 30; // 30 requests per minute default
  const key = options.keyGenerator?.(ip) || ip;

  const now = Date.now();

  // Clean up old entries
  if (!rateLimit.has(key)) {
    rateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const record = rateLimit.get(key)!;

  // Reset if window has passed
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return true;
  }

  // Check if limit exceeded
  if (record.count >= max) {
    return false;
  }

  record.count++;
  return true;
}

export function getRateLimitRemaining(ip: string, max: number = 30): number {
  const record = rateLimit.get(ip);
  if (!record) return max;
  return Math.max(0, max - record.count);
}

// Cleanup old entries every hour to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimit.entries()) {
    if (now > value.resetTime + 3600000) {
      rateLimit.delete(key);
    }
  }
}, 3600000);
