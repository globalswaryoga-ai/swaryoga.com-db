# Comprehensive API Reference & Security Guide

## Overview
Complete reference for Swar Yoga Web API endpoints, including authentication, validation, error handling, and security best practices.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Rate Limiting](#rate-limiting)
4. [Validation](#validation)
5. [Security Headers](#security-headers)
6. [API Endpoints](#api-endpoints)
7. [Testing Guide](#testing-guide)

---

## Authentication

### JWT Token
All protected endpoints require a valid JWT token in the Authorization header.

```bash
Authorization: Bearer <token>
```

**Token Verification Flow:**
1. Client sends token in Authorization header
2. `verifyToken()` from `lib/auth.ts` validates signature
3. Returns decoded payload with `userId` and `ownerType`
4. Returns 401 if invalid or expired

**Example:**
```typescript
import { verifyToken } from '@/lib/auth';

const decoded = verifyToken(token);
if (!decoded) {
  return returnAuthError('Invalid or expired token');
}

const userId = decoded.userId;
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Invalid email format"
        }
      ]
    },
    "timestamp": "2024-12-23T10:30:00Z",
    "traceId": "1234567890-abc123"
  }
}
```

### HTTP Status Codes

| Code | Error | Usage |
|------|-------|-------|
| 400 | BAD_REQUEST | Invalid request format |
| 401 | UNAUTHORIZED | Missing/invalid auth token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Duplicate resource (E11000) |
| 422 | VALIDATION_ERROR | Failed validation |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_SERVER_ERROR | Server error |
| 502 | EXTERNAL_API_ERROR | Third-party service error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |

### Error Handling in Routes
```typescript
import { returnError, returnValidationError, ErrorCode } from '@/lib/error-handler';
import { validateFields } from '@/lib/validation';

// Validation error
const validation = validateFields(data, rules);
if (!validation.valid) {
  return returnValidationError(validation.errors);
}

// Custom error
if (condition) {
  return returnError(ErrorCode.NOT_FOUND, 'User not found');
}
```

---

## Rate Limiting

### Configuration
**Default Limits:**
- Login: 1 request per 60 seconds per IP
- Signup: 5 requests per 10 minutes per IP
- API: 100 requests per minute per IP

**Header on Rate Limited Response:**
```
Retry-After: 45
```

### Implementation
```typescript
import { checkRateLimit, getClientIp } from '@/lib/security';

export const GET = async (request: NextRequest) => {
  const clientIp = getClientIp(request);
  const limit = checkRateLimit(clientIp, {
    windowMs: 60000,
    maxRequests: 100
  });

  if (!limit.allowed) {
    return returnRateLimitError(limit.retryAfter);
  }

  // Handle request
};
```

---

## Validation

### Built-in Validators

#### ObjectId Validation
```typescript
import { validateObjectId } from '@/lib/validation';

if (!validateObjectId(id)) {
  return returnError(ErrorCode.BAD_REQUEST, 'Invalid ID format');
}
```

#### Email Validation
```typescript
import { validateEmail } from '@/lib/validation';

if (!validateEmail(email)) {
  return returnError(ErrorCode.VALIDATION_ERROR, 'Invalid email');
}
```

#### Phone Validation
```typescript
import { validatePhoneNumber } from '@/lib/validation';

if (!validatePhoneNumber(phone)) {
  return returnError(ErrorCode.VALIDATION_ERROR, 'Invalid phone');
}
```

#### Multi-Field Validation
```typescript
import { validateFields } from '@/lib/validation';

const validation = validateFields(data, {
  name: { required: true, minLength: 2, maxLength: 100 },
  email: { required: true, type: 'string' },
  age: { type: 'number', custom: (v) => v >= 18 }
});

if (!validation.valid) {
  return returnValidationError(validation.errors);
}
```

### Input Sanitization
```typescript
import { sanitizeString, extractAllowedFields } from '@/lib/validation';

// Prevent XSS
const safeName = sanitizeString(userInput);

// Allow only specific fields
const safeData = extractAllowedFields(userData, ['name', 'email', 'phone']);
```

---

## Security Headers

### Automatically Applied Headers

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-XSS-Protection | 1; mode=block | Enable XSS protection |
| Strict-Transport-Security | max-age=31536000 | Force HTTPS |
| Content-Security-Policy | default-src 'self' | Prevent inline scripts |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer |
| Permissions-Policy | geolocation=(), microphone=() | Disable features |

### CORS Configuration

**Allowed Origins:**
- `http://localhost:3000` (development)
- `https://swaryoga.com` (production)
- `https://www.swaryoga.com` (production)

**Allowed Methods:** GET, POST, PUT, DELETE, PATCH, OPTIONS

**Allowed Headers:** Content-Type, Authorization, X-CSRF-Token

---

## API Endpoints

### Authentication

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": { "id": "...", "email": "..." }
  },
  "timestamp": "2024-12-23T10:30:00Z"
}
```

#### Signup
```
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}

Response (201):
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "timestamp": "2024-12-23T10:30:00Z"
}
```

### User Profile

#### Get Profile
```
GET /api/users/profile
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+12025551234",
    "createdAt": "2024-12-23T10:30:00Z"
  },
  "timestamp": "2024-12-23T10:30:00Z"
}
```

#### Update Profile
```
PATCH /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "phone": "+12025559876"
}

Response (200):
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-12-23T10:30:00Z"
}
```

### Error Examples

#### Missing Field
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "This field is required"
        }
      ]
    },
    "timestamp": "2024-12-23T10:30:00Z",
    "traceId": "1234567890-abc"
  }
}
```

#### Invalid Token
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "timestamp": "2024-12-23T10:30:00Z",
    "traceId": "1234567890-def"
  }
}
```

#### Rate Limited
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "timestamp": "2024-12-23T10:30:00Z",
    "traceId": "1234567890-ghi"
  }
}
```

Headers: `Retry-After: 45`

---

## Testing Guide

### Using MockRequestBuilder

```typescript
import { MockRequestBuilder } from '@/lib/testing';

const request = new MockRequestBuilder()
  .setMethod('POST')
  .setUrl('http://localhost:3000/api/users/profile')
  .setAuthorization('valid-token')
  .setBody({ name: 'John Doe' })
  .build();

const response = await handler(request);
```

### Testing Assertions

```typescript
import { assertions } from '@/lib/testing';

expect(assertions.isSuccessResponse(response)).toBe(true);
expect(assertions.hasErrorCode(response, 'VALIDATION_ERROR')).toBe(false);
expect(assertions.arrayLength(response, 5)).toBe(true);
```

### Performance Testing

```typescript
import { benchmarkResponseTime, getMemoryUsage } from '@/lib/testing';

const stats = await benchmarkResponseTime(
  () => fetch('/api/endpoint'),
  100  // iterations
);

console.log(`Average: ${stats.average}ms, P95: ${stats.p95}ms`);
console.log('Memory:', getMemoryUsage());
```

---

## Best Practices

### 1. Always Validate Input
```typescript
const validation = validateFields(data, rules);
if (!validation.valid) {
  return returnValidationError(validation.errors);
}
```

### 2. Sanitize User Input
```typescript
const safeName = sanitizeString(userInput);
```

### 3. Use Proper Error Codes
```typescript
// ✅ Correct
return returnError(ErrorCode.NOT_FOUND, 'User not found');

// ❌ Avoid
return returnError(ErrorCode.BAD_REQUEST, 'Everything failed');
```

### 4. Include Trace IDs
```typescript
// Automatically included in all errors
// Use traceId to track issues in production logs
```

### 5. Check Authentication
```typescript
// Always verify token before accessing user data
const decoded = verifyToken(token);
if (!decoded) {
  return returnAuthError();
}
```

---

## Deployment Checklist

- [ ] All endpoints have input validation
- [ ] All sensitive endpoints require authentication
- [ ] Error responses don't leak sensitive info
- [ ] Rate limiting is enabled on auth endpoints
- [ ] Security headers are applied
- [ ] HTTPS is enforced in production
- [ ] CORS origins are restricted
- [ ] Database errors are caught and logged
- [ ] Sensitive data is not logged
- [ ] API documentation is up to date

---

**Last Updated:** December 23, 2024
**Version:** 1.0.0
