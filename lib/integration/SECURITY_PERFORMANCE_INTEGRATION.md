# Security & Performance Module Integration Guide

## Overview
This guide shows how to integrate the newly created security and performance modules into existing API routes.

## ✅ Created Modules

### 1. **Rate Limiting** (`lib/security/advancedRateLimit.ts`)
- `authLimiter` - Auth endpoints (5 requests per 15 minutes)
- `apiLimiter` - API endpoints (50 requests per 1 minute)
- `paymentLimiter` - Payment endpoints (10 requests per hour)
- `globalLimiter` - Global rate limit (1000 requests per hour)
- `websocketLimiter` - WebSocket connections (20 per minute)

### 2. **Input Validation** (`lib/security/validation.ts`)
- `validateEmail()` - Email format validation
- `validatePhone()` - Phone number validation
- `validatePassword()` - Password strength rules
- `validateURL()` - URL validation
- `validateAndSanitize()` - Combined sanitization + validation
- `generateCSRFToken()` - CSRF token generation
- `validateBodySize()` - Request body size limit

### 3. **Request Logging** (`lib/security/requestLogger.ts`)
- `log()` - Log individual requests
- `getLogs()` - Retrieve logs with filters
- `getStatistics()` - Get aggregated statistics
- Auto-cleanup every 10 minutes

### 4. **Caching** (`lib/performance/caching.ts`)
- 7 pre-configured cache endpoints
- Tag-based invalidation
- TTL management (30 min to 24 hours)
- Auto-cleanup every 10 minutes

### 5. **Query Optimization** (`lib/performance/queryOptimization.ts`)
- Performance profiling
- Slow query detection
- Index recommendations
- Pre-defined index schemas

---

## 🔧 Integration Steps

### Step 1: Add Rate Limiting to Auth Routes

**File: `app/api/admin/auth/login/route.ts`**

```typescript
import { authLimiter } from '@/lib/security/advancedRateLimit';

export async function POST(request: NextRequest) {
  // Apply rate limiting FIRST
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = authLimiter.checkLimit(clientId);
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${rateLimitResult.resetIn}s` },
      { status: 429 }
    );
  }

  // ... rest of login logic
}
```

### Step 2: Add Rate Limiting to Payment Routes

**File: `app/api/payments/payu/initiate/route.ts`**

```typescript
import { paymentLimiter } from '@/lib/security/advancedRateLimit';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  
  if (!decoded?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Apply payment rate limiting
  const rateLimitResult = paymentLimiter.checkLimit(decoded.userId);
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many payment requests. Please try later.' },
      { status: 429 }
    );
  }

  // ... rest of payment logic
}
```

### Step 3: Add Input Validation to Workshop Routes

**File: `app/api/workshops/register/route.ts`**

```typescript
import { validateAndSanitize, validateEmail, validatePhone } from '@/lib/security/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate email
    const emailValidation = validateEmail(body.email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: `Invalid email: ${emailValidation.error}` },
        { status: 400 }
      );
    }

    // Validate phone
    const phoneValidation = validatePhone(body.phone);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: `Invalid phone: ${phoneValidation.error}` },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitized = validateAndSanitize(body, {
      fields: ['name', 'email', 'phone', 'address'],
    });

    // ... rest of registration logic
  } catch (error) {
    // ...
  }
}
```

### Step 4: Add Caching to Workshop List

**File: `app/api/workshops/list/route.ts`**

```typescript
import { cacheManager } from '@/lib/performance/caching';

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const cacheKey = 'workshops_list';
    const cached = cacheManager.get(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Fetch from database
    await connectDB();
    const workshops = await Workshop.find({ status: 'active' }).lean();

    // Store in cache (default: 30 minutes)
    cacheManager.set(cacheKey, workshops, { tag: 'workshops' });

    return NextResponse.json({
      success: true,
      data: workshops,
      cached: false,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch workshops' }, { status: 500 });
  }
}
```

### Step 5: Add Cache Invalidation on Update

**File: `app/api/workshops/update/route.ts`**

```typescript
import { cacheManager } from '@/lib/performance/caching';

export async function PUT(request: NextRequest) {
  // ... validation and update logic

  // Invalidate related caches
  cacheManager.invalidateTag('workshops');
  cacheManager.invalidateTag('schedules');

  return NextResponse.json({ success: true, data: updated });
}
```

### Step 6: Add Request Logging

**File: `app/api/middleware.ts`** or add to each route:

```typescript
import { requestLogger } from '@/lib/security/requestLogger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ... endpoint logic

    requestLogger.log({
      method: request.method,
      path: request.nextUrl.pathname,
      status: 200,
      duration: Date.now() - startTime,
      userId: decoded?.userId,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    requestLogger.log({
      method: request.method,
      path: request.nextUrl.pathname,
      status: 500,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    throw error;
  }
}
```

### Step 7: View Request Statistics

**File: `app/api/admin/stats/requests/route.ts`**

```typescript
import { requestLogger } from '@/lib/security/requestLogger';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);

  if (!decoded?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = requestLogger.getStatistics();

  return NextResponse.json({
    success: true,
    data: {
      summary: stats.summary,
      byEndpoint: stats.byEndpoint,
      topErrors: stats.topErrors,
    },
  });
}
```

---

## 📊 Pre-configured Cache Endpoints

```typescript
{
  'workshops_list': 30 minutes,
  'workshop_details': 30 minutes,
  'schedules_list': 30 minutes,
  'user_profile': 5 minutes,
  'user_orders': 5 minutes,
  'panchang_data': 24 hours,
  'life_planner_tasks': 10 minutes,
}
```

---

## 🧪 Testing the Integration

### Test Rate Limiting

```bash
# Should fail after 5 attempts in 15 minutes
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/admin/auth/login \
    -H "Content-Type: application/json" \
    -d '{"userId":"admin","password":"test"}'
  echo "Attempt $i"
  sleep 1
done
```

### Test Input Validation

```bash
curl -X POST http://localhost:3000/api/workshops/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "phone": "123"
  }'
# Should return validation error
```

### Test Caching

```bash
# First request (no cache)
curl http://localhost:3000/api/workshops/list

# Second request (cached)
curl http://localhost:3000/api/workshops/list
# Should return with "cached: true"
```

### Test Request Logging

```bash
# Make some API calls, then check stats
curl http://localhost:3000/api/admin/stats/requests \
  -H "Authorization: Bearer <admin_token>"
```

---

## 🎯 Priority Integration Order

1. **Rate Limiting** (Auth + Payment routes) - 15 min
2. **Input Validation** (Workshop + User routes) - 15 min
3. **Request Logging** (All routes) - 20 min
4. **Caching** (List endpoints) - 15 min
5. **Testing & Verification** - 15 min

---

## ✅ Verification Checklist

- [ ] Rate limiters return 429 after threshold
- [ ] Invalid input returns validation errors
- [ ] Requests are logged with timestamps
- [ ] Cache hits reduce database queries
- [ ] Cache invalidation clears stale data
- [ ] Request statistics accurate
- [ ] No performance degradation
- [ ] All tests passing

---

## 📚 Module APIs Quick Reference

### Rate Limiter
```typescript
import { authLimiter, apiLimiter, paymentLimiter } from '@/lib/security/advancedRateLimit';

const result = limiter.checkLimit(clientId);
// result: { allowed: boolean, resetIn: number, requestsRemaining: number }
```

### Validation
```typescript
import { validateEmail, validatePhone, validateAndSanitize } from '@/lib/security/validation';

const email = validateEmail('test@example.com');
// email: { valid: boolean, error?: string, sanitized: string }

const sanitized = validateAndSanitize({ name: '<script>' }, { fields: ['name'] });
// sanitized: { name: 'script' } (HTML removed)
```

### Request Logger
```typescript
import { requestLogger } from '@/lib/security/requestLogger';

requestLogger.log({ method: 'POST', path: '/api/test', status: 200, duration: 50 });

const stats = requestLogger.getStatistics();
// stats: { summary: {...}, byEndpoint: {...}, topErrors: [...] }
```

### Cache Manager
```typescript
import { cacheManager } from '@/lib/performance/caching';

cacheManager.set('key', data, { tag: 'workshops', ttl: 30 * 60 });
const data = cacheManager.get('key');
cacheManager.invalidateTag('workshops');
```

### Query Profiler
```typescript
import { queryProfiler, RecommendedIndexes } from '@/lib/performance/queryOptimization';

const { data, stats } = await queryProfiler.profileQuery('findUser', () =>
  User.findById(id)
);

console.log(queryProfiler.getReport());
```

---

## 🚀 Next Steps

1. Pick one integration step above
2. Implement in target route
3. Test with provided curl commands
4. Move to next integration
5. Run full test suite when all integrated

