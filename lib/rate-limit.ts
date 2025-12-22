/**
 * @fileoverview Rate Limiting Middleware for API Endpoints
 * @author Swar Yoga Team
 * @copyright 2025 Global Swar Yoga AI - All Rights Reserved
 * @protected This code is protected under intellectual property laws
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, this should be replaced with Redis
const requestStore: Map<string, RequestRecord> = new Map();

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
};

/**
 * Get client identifier from request
 * Uses IP address or user ID if authenticated
 */
export function getClientId(headers: Headers, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Check if request should be rate limited
 * Returns true if request should be allowed, false if rate limited
 */
export function checkRateLimit(
  clientId: string,
  config: RateLimitConfig = defaultConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = requestStore.get(clientId);

  // If no record exists or window has expired, create new record
  if (!record || now > record.resetTime) {
    const newRecord: RequestRecord = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    requestStore.set(clientId, newRecord);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newRecord.resetTime,
    };
  }

  // Check if limit exceeded
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment counter
  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Cleanup old records from memory (prevent memory leak)
 * Call this periodically (e.g., every 5 minutes)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [clientId, record] of requestStore.entries()) {
    if (now > record.resetTime) {
      requestStore.delete(clientId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned up ${cleaned} expired records`);
  }
}

/**
 * Get current stats of rate limit store
 */
export function getRateLimitStats() {
  return {
    totalTrackedClients: requestStore.size,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Reset rate limit for specific client (admin only)
 */
export function resetClientRateLimit(clientId: string): boolean {
  return requestStore.delete(clientId);
}

/**
 * Clear all rate limit records
 */
export function clearAllRateLimits(): number {
  const count = requestStore.size;
  requestStore.clear();
  return count;
}
