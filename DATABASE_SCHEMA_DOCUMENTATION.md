# Swar Yoga Database Schema Documentation

**Last Updated:** December 22, 2025  
**Database:** MongoDB Atlas  
**ODM:** Mongoose  
**Location:** `lib/db.ts`

---

## Table of Contents

1. [User Schema](#user-schema)
2. [Budget Schema](#budget-schema)
3. [Account Schema](#account-schema)
4. [Transaction Schema](#transaction-schema)
5. [Workshop Schema](#workshop-schema)
6. [Order Schema](#order-schema)
7. [Signin Schema](#signin-schema)
8. [Index Strategy](#index-strategy)

---

## User Schema

**Model Name:** `User`  
**Collection:** `users`  
**Purpose:** Stores user account information and authentication data

### Fields

| Field | Type | Required | Unique | Indexed | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | Yes | - | Yes | MongoDB primary key |
| `profileId` | Number | Yes | Yes | Yes | Human-readable user ID |
| `name` | String | Yes | - | No | User's full name |
| `email` | String | Yes | Yes | Yes | Email address |
| `phone` | String | Yes | - | No | Phone number with country code |
| `countryCode` | String | Yes | - | No | Country calling code (+91, +1, etc) |
| `country` | String | Yes | - | No | Country name |
| `state` | String | Yes | - | No | State/Province |
| `gender` | String | Yes | - | No | Male/Female |
| `age` | Number | Yes | - | No | Age (validated 13-150) |
| `profession` | String | Yes | - | No | Profession/Occupation |
| `password` | String | Yes | - | No | Bcrypt hashed password |
| `profileImage` | String | No | - | No | URL to profile photo |
| `createdAt` | Date | Yes | - | Yes | Account creation timestamp |
| `updatedAt` | Date | Yes | - | No | Last update timestamp |

### Indexes

```javascript
// Primary indexes
email: 1 (unique)
profileId: 1 (unique)
createdAt: 1
```

### Validation

- Email: Valid email format, unique constraint
- Age: Between 13 and 150
- Password: Min 8 characters (enforced at endpoint)
- Phone: Stored with country code

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "profileId": 123456,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "countryCode": "+91",
  "country": "India",
  "state": "Maharashtra",
  "gender": "Male",
  "age": 28,
  "profession": "Software Engineer",
  "password": "$2a$10$...",
  "profileImage": "https://...",
  "createdAt": "2025-12-22T10:00:00Z",
  "updatedAt": "2025-12-22T10:00:00Z"
}
```

---

## Budget Schema

**Model Name:** `Budget`  
**Collection:** `budgets`  
**Purpose:** Stores user's yearly budget plan and income allocations

### Fields

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | - | MongoDB primary key |
| `userId` | ObjectId | Yes | Yes | Reference to User |
| `year` | Number | Yes | - | Budget year |
| `currency` | String | Yes | - | Currency code (INR, USD, etc) |
| `incomeTargetYearly` | Number | Yes | - | Annual income target |
| `incomeTargetMonthly` | Number | Yes | - | Monthly income target |
| `allocations` | Array | Yes | - | Budget allocation categories |
| `allocations[].key` | String | Yes | - | Unique allocation key |
| `allocations[].label` | String | Yes | - | Display label |
| `allocations[].percent` | Number | Yes | - | Percentage allocation (0-100) |
| `allocations[].kind` | String | Yes | - | Type: "profit" or "expense" |
| `createdAt` | Date | Yes | Yes | Creation timestamp |
| `updatedAt` | Date | Yes | - | Last update timestamp |

### Indexes

```javascript
userId: 1
createdAt: 1
```

### Validation

- Allocations must sum to 100% (enforced at endpoint)
- Year must be valid
- Percentages must be 0-100

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
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
  ],
  "createdAt": "2025-12-22T10:00:00Z",
  "updatedAt": "2025-12-22T10:00:00Z"
}
```

---

## Account Schema

**Model Name:** `Account`  
**Collection:** `accounts`  
**Purpose:** Stores user's financial accounts (bank, cash, investment, etc)

### Fields

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | - | MongoDB primary key |
| `userId` | ObjectId | Yes | Yes | Reference to User |
| `name` | String | Yes | - | Account name |
| `type` | String | Yes | - | Type: bank, cash, investment, loan |
| `accountNumber` | String | No | - | Account number (masked) |
| `bankName` | String | No | - | Bank name |
| `balance` | Number | Yes | - | Current balance |
| `budgetAllocationId` | String | No | - | Reference to budget allocation |
| `createdAt` | Date | Yes | Yes | Creation timestamp |
| `updatedAt` | Date | Yes | - | Last update timestamp |

### Indexes

```javascript
userId: 1
createdAt: 1
```

### Account Types

- **bank**: Bank account
- **cash**: Cash/Physical money
- **investment**: Investment account (stocks, crypto, etc)
- **loan**: Loan account

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439011",
  "name": "Primary Bank Account",
  "type": "bank",
  "accountNumber": "****1234",
  "bankName": "HDFC Bank",
  "balance": 50000,
  "budgetAllocationId": "alloc-123456",
  "createdAt": "2025-12-22T10:00:00Z",
  "updatedAt": "2025-12-22T10:00:00Z"
}
```

---

## Transaction Schema

**Model Name:** `Transaction`  
**Collection:** `transactions`  
**Purpose:** Tracks all financial transactions (income, expenses)

### Fields

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | - | MongoDB primary key |
| `userId` | ObjectId | Yes | Yes | Reference to User |
| `type` | String | Yes | - | Type: income or expense |
| `amount` | Number | Yes | - | Transaction amount |
| `description` | String | Yes | - | Transaction description |
| `category` | String | Yes | - | Category name |
| `account_id` | ObjectId | Yes | Yes | Reference to Account |
| `date` | Date | Yes | Yes | Transaction date |
| `createdAt` | Date | Yes | Yes | Creation timestamp |

### Indexes

```javascript
userId: 1
account_id: 1
date: -1
createdAt: -1
```

### Transaction Types

- **income**: Money received
- **expense**: Money spent

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439014",
  "userId": "507f1f77bcf86cd799439011",
  "type": "income",
  "amount": 50000,
  "description": "Monthly salary",
  "category": "Salary",
  "account_id": "507f1f77bcf86cd799439013",
  "date": "2025-12-22T10:00:00Z",
  "createdAt": "2025-12-22T10:00:00Z"
}
```

---

## Workshop Schema

**Model Name:** `Workshop`  
**Collection:** `workshops`  
**Purpose:** Defines workshop courses and metadata

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB primary key |
| `slug` | String | Yes | URL-friendly name |
| `title` | String | Yes | Workshop title |
| `description` | String | No | Detailed description |
| `active` | Boolean | Yes | Whether workshop is active |
| `createdAt` | Date | Yes | Creation timestamp |

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439015",
  "slug": "health-yoga",
  "title": "Health & Wellness Yoga",
  "description": "Learn yoga for health and wellness",
  "active": true,
  "createdAt": "2025-12-22T10:00:00Z"
}
```

---

## Workshop Schedule Schema

**Model Name:** `WorkshopSchedule`  
**Collection:** `workshopschedules`  
**Purpose:** Stores individual workshop session schedules

### Fields

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | - | MongoDB primary key |
| `workshopId` | ObjectId | Yes | Yes | Reference to Workshop |
| `workshopSlug` | String | Yes | Yes | Workshop slug (for quick lookup) |
| `date` | String | Yes | Yes | Session date (YYYY-MM-DD) |
| `mode` | String | Yes | - | online or offline |
| `language` | String | Yes | - | Session language |
| `fees` | Number | Yes | - | Registration fees |
| `currency` | String | Yes | - | Currency code |
| `totalSeats` | Number | Yes | - | Total available seats |
| `bookedSeats` | Number | Yes | - | Currently booked seats |
| `published` | Boolean | Yes | Yes | Whether publicly listed |
| `createdAt` | Date | Yes | Yes | Creation timestamp |

### Indexes

```javascript
workshopId: 1
workshopSlug: 1
date: 1
published: 1
createdAt: -1
```

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439016",
  "workshopId": "507f1f77bcf86cd799439015",
  "workshopSlug": "health-yoga",
  "date": "2025-12-25",
  "mode": "online",
  "language": "Hindi",
  "fees": 500,
  "currency": "INR",
  "totalSeats": 50,
  "bookedSeats": 25,
  "published": true,
  "createdAt": "2025-12-22T10:00:00Z"
}
```

---

## Order Schema

**Model Name:** `Order`  
**Collection:** `orders`  
**Purpose:** Tracks workshop registration orders and payments

### Fields

| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | - | MongoDB primary key |
| `userId` | ObjectId | No | Yes | Reference to User (if registered) |
| `workshopId` | ObjectId | Yes | Yes | Reference to Workshop |
| `scheduleId` | ObjectId | Yes | - | Reference to WorkshopSchedule |
| `payuTxnId` | String | No | Yes | PayU transaction ID |
| `amount` | Number | Yes | - | Order amount |
| `currency` | String | Yes | - | Currency code |
| `paymentMethod` | String | Yes | - | Payment method |
| `paymentStatus` | String | Yes | Yes | Payment status |
| `orderStatus` | String | Yes | Yes | Order status |
| `email` | String | Yes | Yes | Registrant email |
| `phone` | String | Yes | - | Registrant phone |
| `name` | String | Yes | - | Registrant name |
| `seatInventoryAdjusted` | Boolean | Yes | - | Whether seats were decremented |
| `paymentResponse` | Object | No | - | PayU response data |
| `createdAt` | Date | Yes | Yes | Creation timestamp |
| `updatedAt` | Date | Yes | - | Last update timestamp |

### Indexes

```javascript
userId: 1
workshopId: 1
scheduleId: 1
payuTxnId: 1 (sparse)
email: 1
paymentStatus: 1
orderStatus: 1
createdAt: -1
```

### Payment Status Values

- `pending`: Awaiting payment
- `successful`: Payment completed
- `failed`: Payment failed
- `pending_manual`: Awaiting manual verification (Nepal flow)

### Order Status Values

- `confirmed`: Order confirmed
- `cancelled`: Order cancelled
- `completed`: Workshop completed

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439017",
  "userId": "507f1f77bcf86cd799439011",
  "workshopId": "507f1f77bcf86cd799439015",
  "scheduleId": "507f1f77bcf86cd799439016",
  "payuTxnId": "TXN123456",
  "amount": 515.50,
  "currency": "INR",
  "paymentMethod": "payu",
  "paymentStatus": "successful",
  "orderStatus": "confirmed",
  "email": "john@example.com",
  "phone": "9876543210",
  "name": "John Doe",
  "seatInventoryAdjusted": true,
  "paymentResponse": { ... },
  "createdAt": "2025-12-22T10:00:00Z",
  "updatedAt": "2025-12-22T10:30:00Z"
}
```

---

## Signin Schema

**Model Name:** `Signin`  
**Collection:** `signins`  
**Purpose:** Audit log for user login attempts

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | MongoDB primary key |
| `email` | String | Yes | User email |
| `userId` | ObjectId | Yes | Reference to User |
| `ipAddress` | String | No | Client IP address |
| `userAgent` | String | No | Client user agent |
| `createdAt` | Date | Yes | Login timestamp |

### Purpose

Non-critical logging of login attempts for security auditing. Failures here don't block login.

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439018",
  "email": "john@example.com",
  "userId": "507f1f77bcf86cd799439011",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2025-12-22T10:00:00Z"
}
```

---

## Index Strategy

### Rationale

Indexes are created on:
1. **Foreign keys** (`userId`, `workshopId`, etc) - for joins and filtering
2. **Frequently queried fields** (`email`, `date`, `published`)
3. **Sorting fields** (`createdAt`, `date`)
4. **Unique constraints** (`email`, `profileId`, `payuTxnId`)

### Performance Notes

- Use `.lean()` on read queries for better performance
- Compound indexes on `(userId, createdAt)` for user-specific chronological queries
- Sparse indexes for optional fields (`payuTxnId`)

### Compound Indexes (Used in Queries)

```javascript
// User searches
Users: { email: 1 }, { profileId: 1 }

// Budget lookups
Budget: { userId: 1, year: 1 }

// Account queries
Account: { userId: 1, createdAt: -1 }

// Transaction queries
Transaction: { userId: 1, date: -1 }, { account_id: 1, date: -1 }

// Workshop queries
WorkshopSchedule: { workshopSlug: 1, date: 1, published: 1 }

// Order queries
Order: { payuTxnId: 1 }, { userId: 1, createdAt: -1 }, { email: 1 }
```

---

## Query Patterns

### User Lookups

```javascript
// By email
User.findOne({ email })

// By profileId
User.findOne({ profileId })

// Multiple users
User.find({ createdAt: { $gte: date } })
```

### Budget Queries

```javascript
// Current year budget
Budget.findOne({ userId, year: currentYear })

// All budgets for user
Budget.find({ userId }).lean()
```

### Transaction Queries

```javascript
// Recent transactions
Transaction.find({ userId })
  .sort({ date: -1 })
  .limit(100)
  .lean()

// By account
Transaction.find({ account_id }).lean()
```

### Workshop Schedule Queries

```javascript
// Find published schedules
WorkshopSchedule.find({ 
  workshopSlug, 
  published: true 
}).sort({ date: 1 })

// Check seat availability
WorkshopSchedule.findOne({ _id, "bookedSeats": { $lt: "totalSeats" } })
```

### Order Queries

```javascript
// Find by PayU transaction
Order.findOne({ payuTxnId })

// User's orders
Order.find({ userId, paymentStatus: "successful" })

// Recent orders
Order.find({ createdAt: { $gte: date } }).lean()
```

---

## Best Practices

1. **Always use `.lean()`** on read-only queries
2. **Use indexes** for all frequently queried fields
3. **Index foreign keys** for relationship queries
4. **Compound indexes** for multi-field filters
5. **Sparse indexes** for optional fields
6. **TTL indexes** for data that expires (future use)

---

## Migration Guide

When adding new fields:

1. Make field optional initially
2. Add index if frequently queried
3. Update relevant API endpoints
4. Update API documentation
5. Test with existing data
6. Deploy to production
7. Monitor query performance

---

**Database Admin:** MongoDB Atlas  
**Connection:** `MONGODB_URI` from environment  
**ORM:** Mongoose 6.x+  
**Validation:** Enforce at application layer and database layer
