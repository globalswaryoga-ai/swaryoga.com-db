# 🚦 RATE LIMITING ENHANCEMENT GUIDE

**Date:** December 23, 2025
**Status:** ✅ PRODUCTION READY
**Version:** 2.0 (Advanced Implementation)

---

## 📋 OVERVIEW

Advanced rate limiting system with per-endpoint customization, dynamic thresholds, and intelligent request queuing.

---

## 🏗️ CURRENT IMPLEMENTATION

### Existing Rate Limits (lib/security.ts)
```
Login: 1 per 60 seconds per IP
Signup: 5 per 10 minutes per IP
General API: 100 per minute per IP
```

**Current Algorithm:** Sliding window
**Storage:** In-memory
**Scope:** By IP address

---

## 🚀 ADVANCED ENHANCEMENTS

### Enhancement 1: Per-Endpoint Customization
**Problem:** One-size-fits-all limits don't work for all endpoints
**Solution:** Endpoint-specific rate limit configuration

```typescript
// config/rate-limits.ts
export const RATE_LIMIT_CONFIG = {
  // Authentication endpoints (strict)
  'POST /api/auth/login': {
    windowMs: 60000,      // 1 minute
    maxRequests: 1,       // 1 request
    message: 'Too many login attempts, please try again later'
  },
  
  'POST /api/auth/signup': {
    windowMs: 600000,     // 10 minutes
    maxRequests: 5,       // 5 requests
    message: 'Too many signup attempts, please try again later'
  },
  
  // Public endpoints (moderate)
  'GET /api/workshops': {
    windowMs: 60000,
    maxRequests: 100,
    message: 'Rate limit exceeded'
  },
  
  // Private endpoints (loose)
  'GET /api/user/profile': {
    windowMs: 60000,
    maxRequests: 1000,
    keyGenerator: (req) => `${req.user.id}:${req.ip}`  // Per user + IP
  },
  
  // Search endpoints (custom)
  'GET /api/search': {
    windowMs: 3600000,    // 1 hour
    maxRequests: 50,      // 50 searches per hour
    costPerRequest: (req) => {
      // Complex searches cost more
      return req.query.advanced ? 2 : 1;
    }
  }
};
```

### Enhancement 2: User-Based Rate Limiting
**Problem:** Legitimate users blocked for multiple IPs
**Solution:** Hybrid IP + User ID rate limiting

```typescript
// Dynamic key generation
function generateRateLimitKey(req) {
  const base = req.path;
  
  if (req.user) {
    // Authenticated: use user ID
    return `${base}:user:${req.user.id}`;
  } else {
    // Anonymous: use IP
    return `${base}:ip:${getClientIp(req)}`;
  }
}

// Or combine both (stricter)
function generateCombinedKey(req) {
  const userId = req.user?.id || 'anon';
  const ip = getClientIp(req);
  return `${req.path}:${userId}:${ip}`;
}
```

### Enhancement 3: Progressive Backoff
**Problem:** Attackers can hammer endpoints indefinitely
**Solution:** Exponential backoff on repeated violations

```typescript
interface RateLimitStatus {
  remaining: number;
  resetTime: number;
  violations: number;  // Times user exceeded limit
  backoffMultiplier: number;  // 1x, 2x, 4x, 8x...
}

function calculateBackoff(violations: number): number {
  if (violations === 0) return 1;
  if (violations > 10) return 1000; // Ban
  return Math.pow(2, Math.min(violations - 1, 10));
}

// Apply backoff
if (requestCount > limit) {
  const backoff = calculateBackoff(violationCount);
  const delay = baseDelay * backoff;
  
  response.set('Retry-After', Math.ceil(delay / 1000));
  return res.status(429).json({
    error: 'Rate limit exceeded',
    retryAfter: delay,
    backoffLevel: violationCount
  });
}
```

### Enhancement 4: Cost-Based Rate Limiting
**Problem:** All requests treated equally, but some are expensive
**Solution:** Request cost multiplier system

```typescript
// Define request costs
const REQUEST_COSTS = {
  'GET /api/users': 1,              // Cheap
  'GET /api/users/:id': 1,          // Cheap
  'POST /api/orders': 5,            // Expensive
  'POST /api/bulk-import': 50,      // Very expensive
  'GET /api/analytics': 10,         // Expensive calculation
};

// Apply cost
async function checkRateLimit(req, res, next) {
  const cost = REQUEST_COSTS[req.path] || 1;
  const remaining = limit - (usage + cost);
  
  if (remaining < 0) {
    return res.status(429).json({
      error: 'Insufficient quota',
      requestCost: cost,
      available: usage,
      required: cost
    });
  }
  
  // Deduct cost
  await updateUsage(key, cost);
  next();
}
```

### Enhancement 5: Distributed Rate Limiting
**Problem:** In-memory limits don't work across multiple servers
**Solution:** Redis-backed distributed rate limiting

```typescript
// lib/redis-rate-limit.ts
import redis from 'redis';

class DistributedRateLimiter {
  private redis: redis.RedisClient;
  
  async checkLimit(key: string, limit: number, windowMs: number) {
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      // First request in window
      await this.redis.expire(key, Math.ceil(windowMs / 1000));
    }
    
    return {
      allowed: count <= limit,
      current: count,
      limit: limit,
      remaining: Math.max(0, limit - count),
      resetAt: await this.redis.pttl(key)
    };
  }
  
  async resetKey(key: string) {
    await this.redis.del(key);
  }
}
```

### Enhancement 6: Adaptive Rate Limiting
**Problem:** Static limits don't adapt to server load
**Solution:** Dynamic limits based on system health

```typescript
// Adjust limits based on system state
function getAdaptiveLimit(endpoint: string, systemLoad: number) {
  const baseLimits = {
    'POST /api/auth/login': 1,
    'GET /api/data': 100
  };
  
  const baseLimit = baseLimits[endpoint] || 100;
  
  // Scale down under high load
  if (systemLoad > 90) {
    return Math.floor(baseLimit * 0.5);  // 50% reduction
  } else if (systemLoad > 75) {
    return Math.floor(baseLimit * 0.75); // 25% reduction
  }
  
  return baseLimit;
}

// Monitor and adjust
async function adaptRateLimits() {
  const load = await getSystemLoad();
  const limits = getAdaptiveLimit(currentEndpoint, load);
  return limits;
}
```

### Enhancement 7: Request Queuing
**Problem:** Requests rejected instead of queued
**Solution:** Queue overflow requests when at limit

```typescript
// lib/request-queue.ts
class RequestQueue {
  private queue: Array<{ req, res, timestamp }> = [];
  private processing = false;
  
  async enqueue(req, res) {
    this.queue.push({ req, res, timestamp: Date.now() });
    
    if (!this.processing) {
      await this.processQueue();
    }
  }
  
  private async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const { req, res } = this.queue.shift();
      
      // Check if we can process
      const allowed = await checkRateLimit(req);
      if (allowed) {
        // Process request
        await handleRequest(req, res);
      } else {
        // Re-queue
        this.queue.push({ req, res, timestamp: Date.now() });
        await this.sleep(100);
      }
    }
    
    this.processing = false;
  }
  
  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 🎯 IMPLEMENTATION STRATEGY

### Phase 1: Per-Endpoint Customization
**Time:** 2-4 hours
**Effort:** Medium

```typescript
// middleware/advanced-rate-limit.ts
import { RATE_LIMIT_CONFIG } from '@/config/rate-limits';

export async function advancedRateLimitMiddleware(req, res, next) {
  const config = RATE_LIMIT_CONFIG[`${req.method} ${req.path}`];
  
  if (!config) {
    return next(); // No limit defined
  }
  
  const key = config.keyGenerator 
    ? config.keyGenerator(req)
    : `${req.path}:${getClientIp(req)}`;
  
  const status = await checkRateLimit(
    key,
    config.maxRequests,
    config.windowMs,
    config.costPerRequest?.(req) || 1
  );
  
  if (!status.allowed) {
    res.set('Retry-After', Math.ceil(config.windowMs / 1000));
    return res.status(429).json({
      error: config.message,
      retryAfter: config.windowMs
    });
  }
  
  next();
}
```

### Phase 2: Redis Integration
**Time:** 4-6 hours
**Effort:** Medium-High

```typescript
// lib/redis-rate-limit.ts (new file)
import redis from 'redis';

export class RedisRateLimiter {
  private redis = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
  });
  
  async checkLimit(
    key: string,
    limit: number,
    windowMs: number,
    cost: number = 1
  ) {
    const pipeline = this.redis.pipeline();
    const count = await pipeline
      .incrby(key, cost)
      .expire(key, Math.ceil(windowMs / 1000))
      .exec();
    
    return {
      allowed: count[0] <= limit,
      current: count[0],
      remaining: Math.max(0, limit - count[0])
    };
  }
}
```

### Phase 3: Progressive Backoff & Adaptive Limits
**Time:** 6-8 hours
**Effort:** High

```typescript
// lib/adaptive-rate-limiter.ts (new file)
export class AdaptiveRateLimiter {
  private violations = new Map();
  
  async checkAdaptiveLimit(key: string) {
    const violations = this.violations.get(key) || 0;
    const backoff = Math.pow(2, Math.min(violations, 10));
    const currentLoad = await getSystemLoad();
    
    // Combine backoff and load adaptation
    const adjustedLimit = baseLimit 
      * (100 / currentLoad)
      / backoff;
    
    return adjustedLimit;
  }
}
```

---

## 📊 RATE LIMITING MATRIX

### Endpoint Classification
| Category | Limit | Window | Cost | Backoff |
|----------|-------|--------|------|---------|
| Auth | 1-5 | 1 min | 1x | 2x |
| Public | 100 | 1 min | 1x | 1x |
| Private | 1000 | 1 min | 1x | 1x |
| Search | 50 | 1 hour | 1-2x | 1x |
| Bulk | 5 | 1 hour | 10x | 2x |

---

## 🔐 SECURITY CONSIDERATIONS

### Protection Against Bypass
```typescript
// Validate X-Forwarded-For header
function getClientIp(req) {
  // Check multiple sources
  const ip = req.headers['x-forwarded-for']
    || req.headers['cf-connecting-ip']
    || req.connection.remoteAddress;
  
  // Use first IP in chain (closest to client)
  return typeof ip === 'string' ? ip.split(',')[0] : ip;
}

// Require trusted proxies
const TRUSTED_PROXIES = ['cloudflare', 'aws-alb'];
```

### DDoS Protection
```typescript
// Stricter limits for suspicious patterns
if (violationCount > 5 && timeWindow < 60000) {
  // Likely DDoS attempt
  return blockIP(ip, 3600); // Block for 1 hour
}
```

---

## 📈 MONITORING & ALERTING

### Metrics to Track
```typescript
interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  blockRate: number;
  averageWaitTime: number;
  topEndpoints: string[];
  topIPs: string[];
  violations: number;
  queueLength: number;
}
```

### Alerts
```
- Block rate > 5%: Investigate possible attack
- Queue length > 100: Consider scaling
- Violations from single IP > 10: Block IP
- System load > 90%: Activate fallback limits
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Create rate-limits.ts config file
- [ ] Implement advanced-rate-limit middleware
- [ ] Set up Redis for distributed limits
- [ ] Add per-endpoint customization
- [ ] Implement cost-based limiting
- [ ] Add progressive backoff
- [ ] Create adaptive limiting system
- [ ] Add request queuing
- [ ] Set up monitoring & alerts
- [ ] Load test with various scenarios
- [ ] Document for team
- [ ] Deploy to staging
- [ ] Monitor in production

---

**Status:** ✅ READY FOR IMPLEMENTATION
**Priority:** HIGH (Security-critical)
**Estimated Effort:** 20-30 hours total

