# Swar Yoga API Documentation

**Version:** 1.0.0  
**Last Updated:** December 22, 2025  
**Base URL:** `https://swaryoga.com/api`  

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Error Responses](#error-responses)
4. [Auth Endpoints](#auth-endpoints)
5. [Accounting Endpoints](#accounting-endpoints)
6. [Workshop Endpoints](#workshop-endpoints)
7. [Payment Endpoints](#payment-endpoints)

---

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```bash
Authorization: Bearer <token>
```

### Token Acquisition

**POST** `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Returns:
```json
{
  "success": true,
  "data": {
    "message": "Login successful",
    "token": "eyJhbGc...",
    "user": { ... }
  }
}
```

---

## Rate Limiting

The following limits are enforced per IP address:

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/login | 10 requests | 1 minute |
| POST /api/auth/signup | 5 requests | 10 minutes |
| POST /api/payments/payu/initiate | 5 requests | 5 minutes |

**Rate Limit Response:**
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

Headers:
- `Retry-After: 45` (seconds to wait before retry)

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-12-22T10:30:00.000Z"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input or missing required fields |
| `DATABASE_ERROR` | 503 | Database operation failed |
| `SERVER_ERROR` | 500 | Internal server error |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AUTHENTICATION_FAILED` | 401 | Login credentials incorrect |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Auth Endpoints

### POST /api/auth/signup

Create a new user account.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "countryCode": "+91",
  "country": "India",
  "state": "Maharashtra",
  "gender": "Male",
  "age": 28,
  "profession": "Software Engineer",
  "password": "SecurePassword123!"
}
```

**Required Fields:** All fields shown above

**Validation Rules:**
- Email: Valid email format, must be unique
- Password: Min 8 characters recommended
- Age: Between 13-150
- Gender: "Male" or "Female"

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "message": "User registered successfully",
    "token": "eyJhbGc...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "profileId": "123456",
      "name": "John Doe",
      "email": "john@example.com",
      "country": "India",
      "state": "Maharashtra"
    }
  },
  "timestamp": "2025-12-22T10:30:00.000Z"
}
```

**Rate Limit:** 5 requests per 10 minutes per IP

---

### POST /api/auth/login

Authenticate and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Required Fields:** email, password

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Login successful",
    "token": "eyJhbGc...",
    "user": { ... }
  },
  "timestamp": "2025-12-22T10:30:00.000Z"
}
```

**Rate Limit:** 10 requests per 1 minute per IP

---

## Accounting Endpoints

### GET /api/accounting/budget

Retrieve user's budget plan.

**Authentication:** Required (Bearer token)

**Query Parameters:**
```
?year=2025
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "year": 2025,
    "currency": "INR",
    "incomeTargetYearly": 1200000,
    "incomeTargetMonthly": 100000,
    "allocations": [
      {
        "key": "profit",
        "label": "Profit",
        "percent": 30,
        "kind": "profit"
      },
      {
        "key": "rent",
        "label": "Rent",
        "percent": 20,
        "kind": "expense"
      }
    ]
  },
  "timestamp": "2025-12-22T10:30:00.000Z"
}
```

---

### GET /api/accounting/accounts

Retrieve all user accounts.

**Authentication:** Required (Bearer token)

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Primary Bank Account",
      "type": "bank",
      "balance": 50000,
      "accountNumber": "****1234",
      "bankName": "HDFC Bank",
      "budgetAllocationId": "alloc-123456",
      "created_at": "2025-12-22T10:00:00.000Z"
    }
  ],
  "timestamp": "2025-12-22T10:30:00.000Z"
}
```

---

### POST /api/accounting/accounts

Create a new account.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "name": "Savings Account",
  "type": "bank",
  "accountNumber": "1234567890",
  "bankName": "ICICI Bank",
  "balance": 100000,
  "budgetAllocationId": "alloc-123456"
}
```

**Required Fields:** name, type, balance  
**Optional Fields:** accountNumber, bankName, budgetAllocationId

**Account Types:** "bank", "cash", "investment", "loan"

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Savings Account",
    "type": "bank",
    "balance": 100000,
    ...
  },
  "timestamp": "2025-12-22T10:30:00.000Z"
}
```

---

### GET /api/accounting/transactions

Retrieve user's transactions.

**Authentication:** Required (Bearer token)

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "type": "income",
      "amount": 50000,
      "description": "Salary",
      "category": "Salary",
      "account_id": "507f1f77bcf86cd799439012",
      "date": "2025-12-22T10:00:00.000Z"
    }
  ],
  "timestamp": "2025-12-22T10:30:00.000Z"
}
```

---

## Workshop Endpoints

### GET /api/workshops/schedules

Get published workshop schedules.

**Authentication:** Optional

**Query Parameters:**
```
?workshopSlug=health-yoga
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "workshopSlug": "health-yoga",
      "workshopId": "507f1f77bcf86cd799439010",
      "date": "2025-12-25",
      "mode": "online",
      "language": "Hindi",
      "fees": 500,
      "currency": "INR",
      "totalSeats": 50,
      "bookedSeats": 25,
      "published": true
    }
  ]
}
```

---

## Payment Endpoints

### POST /api/payments/payu/initiate

Initiate PayU payment.

**Authentication:** Optional (for logged-in users)

**Request Body:**
```json
{
  "workshopId": "507f1f77bcf86cd799439010",
  "amount": 500,
  "currency": "INR",
  "email": "user@example.com",
  "phone": "9876543210",
  "name": "John Doe"
}
```

**Required Fields:** workshopId, amount, currency, email, phone, name

**Rate Limit:** 5 requests per 5 minutes per IP

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "txnid": "TXN123456",
    "amount": 515.50,
    "currency": "INR",
    "redirectUrl": "https://secure.payu.in/...",
    "formData": { ... }
  }
}
```

---

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-12-22T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-12-22T10:30:00.000Z"
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required or failed |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Server Error - Internal server error |
| 503 | Service Unavailable - Database or service down |

---

## Best Practices

1. **Always include `Authorization` header** for protected endpoints
2. **Handle rate limiting** - check `Retry-After` header
3. **Validate input** before sending requests
4. **Store tokens securely** (never in localStorage for sensitive data)
5. **Handle error codes** appropriately in client

---

## SDK/Client Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://swaryoga.com/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get budget
const budget = await client.get('/accounting/budget?year=2025');
```

### cURL

```bash
curl -X GET https://swaryoga.com/api/accounting/budget?year=2025 \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## Support

For API issues or questions:
- Email: api-support@swaryoga.com
- Documentation: https://docs.swaryoga.com
- Status Page: https://status.swaryoga.com

---

**Last Updated:** December 22, 2025  
**Version:** 1.0.0  
**Maintained By:** Swar Yoga Engineering Team
