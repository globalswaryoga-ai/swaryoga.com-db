# Swar Yoga Web — Copilot Instructions

## Architecture Overview
**Next.js 14 App Router** + **MongoDB/Mongoose**. The app blends e-commerce (workshops, courses, payments), lifestyle (life planner, panchang calendar), and admin tools (CRM dashboard). All user-facing features require JWT auth; admin endpoints require `decoded.isAdmin`.

## Project Structure Essentials
- **`app/api/**/route.ts`**: API endpoints. Use `@/` imports (path alias).
- **`lib/db.ts`**: All Mongoose schemas & models centralized (~780 lines). Add new schemas there.
- **`lib/auth.ts`**: JWT sign/verify. Payload includes `userId` (user) or `username`/`isAdmin` (admin).
- **`lib/payments/payu.ts`**: PayU SHA512 hashing + sanitization.
- **`lib/rateLimit.ts`** + **`lib/rateLimitManager.ts`**: In-memory throttling per userId+IP.
- **`app/**`**: Next.js pages & components. Client components use `'use client'`.
- **Legacy artifacts** (`server.js`, `api/` folder): Avoid unless explicitly needed.

## Commands & Development
- **Dev:** `npm run dev` (includes health check; use `npm run dev:no-check` to skip)
- **Build:** `npm run build` → verify with `npm run type-check` + `npm run lint` (build ignores TS/ESLint by config)
- **PM2 (self-hosted):** `npm run pm2:{start,stop,restart,logs}` (see `ecosystem.config.js`)

## Core Patterns: Auth, Responses, Database

### Authentication
Every protected endpoint mirrors this pattern:
```typescript
const token = request.headers.get('authorization')?.slice('Bearer '.length);
const decoded = verifyToken(token);
if (!decoded?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```
**Admin endpoints** check `decoded.isAdmin` instead of `decoded.userId`. **User endpoints** check `decoded.userId`.

### Response Format
Standardized across 50+ endpoints:
```typescript
// Success: Always includes `success: true` and `data`
NextResponse.json({ success: true, data: { ...items }, message?: 'Confirmation' }, { status: 200 })

// Error: `error` field + HTTP status (400, 401, 429, 500)
NextResponse.json({ error: 'Human-readable message' }, { status: 400 })
```

### Database Pattern
1. Always `await connectDB()` early.
2. Use `.lean()` for read-only queries (no save overhead).
3. Validate Mongo IDs with `Types.ObjectId.isValid(id)` before queries.
4. Wrap updates/deletes in try-catch to handle validation errors.

## Workshops: Key Workflow
Swar Yoga teaches **Online/Offline/Residential** yoga in **Hindi/English/Marathi**. Payment gates seat inventory.

### Core Models
- **`Workshop`** (metadata, pricing, instructor) → stored statically in `lib/workshopsData.ts`
- **`WorkshopSchedule`** (dates, times, capacities) → fetched dynamically
- **`WorkshopSeatInventory`** (remainingSeats per schedule) → decremented on order success
- **`Order`** (userId, items[], total, paymentStatus) → marked `seatInventoryAdjusted: true` after payment callback

### Seat Decrement Idempotency
Payment callback (`app/api/payments/payu/callback/route.ts`) checks `Order.seatInventoryAdjusted` to prevent double-decrement on duplicate webhooks. Decrements `WorkshopSeatInventory` per `workshopSlug` + `scheduleId`.

## Payments (PayU) — End-to-End Flow

### Initiation (`POST /api/payments/payu/initiate`)
1. Verify JWT + rate-limit (in-memory: 1 per 60s per userId+IP; DB cooldown: reject if pending order exists).
2. Create `Order` with `paymentStatus: 'pending'`.
3. **Add 3.3% platform fee server-side** (user doesn't see it until callback).
4. Sanitize fields: strip `|` from PayU fields; validate email, phone.
5. **Nepal QR fallback:** If country='Nepal', set `paymentMethod: 'nepal_qr'` + `paymentStatus: 'pending_manual'` (skip PayU).
6. Generate PayU-safe `txnid` (alphanumeric, ≤ 25 chars) → store in `Order.payuTxnId`.
7. Compute **SHA512 hash** via `lib/payments/payu.ts` (strict field order + UDF placeholders required).
8. Return form data for browser to submit hidden form to PayU.

### Callback (`POST /api/payments/payu/callback`)
1. Read `request.formData()`.
2. Verify **SHA512 hash** (failure → 400).
3. Lookup `Order` by `payuTxnId` (preferred) or `_id` (fallback for legacy).
4. If `paymentStatus: 'successful'`:
   - Mark `Order.seatInventoryAdjusted: false` initially.
   - Decrement `WorkshopSeatInventory` for booked schedule.
   - Set `Order.seatInventoryAdjusted: true` + `paymentStatus: 'completed'`.
5. **Idempotency:** If `seatInventoryAdjusted: true` already, skip seat decrement (webhook retry safety).

### Webhooks
- **`app/api/webhooks/payu/{successful,failed,refund}/route.ts`**: S2S callbacks from PayU. Verify hash, update `Order.paymentStatus`.

### Debugging
- Set `DEBUG_PAYU=1` for verbose logs.
- Hash failures → run `node diagnose-payu-403.js`.
- MongoDB connection → `node test-mongodb.js`.
- Full PayU flow → `DEBUG_PAYU=1 node debug-payu-advanced.js`.

## Environment & Configuration

### Required Env Variables
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — 32+ char random string (production: strong secret)
- `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT` — PayU credentials
- `PAYU_MODE` — 'TEST' or 'PRODUCTION'

### Optional but Important
- `.env.payment` file (evaluated at build time) → sets `NEXT_PUBLIC_PAYMENT_OVERRIDES` for workshop payment links. **Restart dev server or rebuild after changes.**
- `DEBUG_PAYU=1` — enables PayU logging in scripts

### Base URL Resolution
`lib/requestBaseUrl.ts` auto-detects redirect base URL:
- Production: uses real request hostname (ignores localhost env vars)
- Development: respects env vars if request is from localhost

## Testing & Validation
- **`node test-api.js`** — generic API tester
- **`node test-payu-integration.js`** — full PayU flow (TEST mode)
- **`node test-mongodb.js`** — DB connection check
- No Jest config found → tests are manual scripts (review `tests/` folder for patterns)

## Common Gotchas
1. **PayU field order matters.** SHA512 hash requires exact field sequence + UDF placeholder logic (see `lib/payments/payu.ts`).
2. **`connectDB()` state is not per-request.** Mongoose caches connections; multiple calls are safe but check `mongoose.connection.readyState`.
3. **Seat inventory is per (workshopSlug, scheduleId) tuple.** Querying only by scheduleId can fail if multiple workshops share IDs.
4. **Duplicate PayU txnids must fail.** Before creating `Order`, check `Order.findOne({ payuTxnId })` to reject re-submissions.
5. **Nepal orders skip PayU.** Set `paymentMethod: 'nepal_qr'` + `paymentStatus: 'pending_manual'` (manual admin reconciliation later).
6. **3.3% fee is non-negotiable.** Added server-side; hidden from user until confirmation.
7. **Legacy `Order.findById(txnid)` fallback exists.** Older flows stored Mongo `_id` as txnid; newer flows use `payuTxnId`.

## CRM Leads System — Structure & Data Flow

### Leads Schema (`lib/schemas/enterpriseSchemas.ts`)
```typescript
Lead {
  phoneNumber: String (required, unique, indexed)
  email: String (optional, lowercase, trimmed)
  name: String (optional, trimmed)
  status: enum ['lead', 'prospect', 'customer', 'inactive'] (default: 'lead')
  labels: [String] (for categorization, indexed)
  source: enum ['website', 'import', 'api', 'manual', 'whatsapp', 'referral', 'social', 'event']
  workshopId: ObjectId (ref to WorkshopSchedule, sparse)
  workshopName: String (denormalized for queries)
  lastMessageAt: Date (tracks WhatsApp engagement)
  metadata: Mixed (custom fields)
  timestamps: true (createdAt, updatedAt auto-managed)
}
```
**Indexes:** `(status, lastMessageAt)`, `(labels)`, `(phoneNumber)`, `(source)`

### Leads API Endpoints (`app/api/admin/crm/leads/`)

#### `GET /api/admin/crm/leads` — List leads
- **Filters:** `status`, `workshop` (workshopName), `q` (search by name/phone/email)
- **Pagination:** `limit` (default 50, max 200), `skip` (default 0)
- **Response:** `{ success, data: { leads, total, limit, skip } }`
- **Uses:** `.lean()` for performance (read-only)

#### `POST /api/admin/crm/leads` — Create single lead
- **Body:** `{ phoneNumber, name?, email?, status?, labels?, source?, workshopId?, workshopName? }`
- **Returns 409 if duplicate** by phoneNumber or email (returns existing lead info for UI)
- **Returns 201 on success** with created lead doc

#### `POST /api/admin/crm/leads/bulk` — Bulk operations
- **Operations:**
  - `import`: Import array of leads (checks existing before insert to avoid duplicates per-batch)
  - `updateStatus`: Update status for array of lead IDs
  - `delete`: Delete multiple leads by ID
  - `export`: Export as CSV/JSON with filters

#### `POST /api/admin/crm/leads/upload` — Excel import
- **Accepts:** Excel file with columns: Phone, Phone Number, Email, Name, Status, Labels, Source, Workshop
- **Returns:** `{ success, data: { imported, skipped, failed, errors } }`
- **Error handling:** Catches duplicates, missing phone, invalid format

#### `PUT /api/admin/crm/leads/[id]` — Update lead
- **Body:** Any Lead fields (phoneNumber immutable after creation)
- **Returns:** Updated lead doc

#### `DELETE /api/admin/crm/leads/[id]` — Delete lead
- **Returns:** `{ success: true, data: { deletedCount: 1 } }`

### Critical: E11000 Duplicate Key Error
**Problem:** `phoneNumber` has `unique: true` constraint. During bulk import, if the Excel file contains duplicate phone numbers **within the same batch**, Mongoose throws E11000 error on the second insert attempt.

**Why it happens:** 
1. Bulk import loops through leads array (line ~54 in `bulk/route.ts`)
2. Checks if lead exists in **database** only: `await Lead.findOne({ phoneNumber })`
3. Does NOT deduplicate within the current batch
4. If file has two rows with same phone, second insert violates unique constraint

**Current behavior:**
```typescript
// DON'T: This fails if batch has duplicates
for (const leadData of leads) {
  const existing = await Lead.findOne({ phoneNumber }); // Only checks DB
  if (existing) results.skipped++;
  else await Lead.create(...); // Fails on 2nd duplicate in batch
}
```

**Workaround (use this pattern):**
```typescript
// DO: Deduplicate within batch before any inserts
const seenPhones = new Set();
const deduped = leads.filter(l => {
  if (seenPhones.has(l.phoneNumber)) return false;
  seenPhones.add(l.phoneNumber);
  return true;
});
// Then process deduped array
```

### WhatsApp Integration
Leads link to WhatsApp messages via:
- **WhatsAppMessage** schema stores every outbound/inbound message
- `leadId` (ref) connects to Lead document
- `status` enum tracks: queued → sent → delivered → read or failed
- Bulk sends tracked via `bulkBatchId`
- Retry logic: `retryCount`, `maxRetries`, `nextRetryAt`

### Related CRM Endpoints
- `/api/admin/crm/messages` — WhatsApp message history + send
- `/api/admin/crm/templates` — Message templates for bulk send
- `/api/admin/crm/consent` — Opt-in/opt-out tracking per phoneNumber
- `/api/admin/crm/labels` — Lead label management

## Admin System Architecture

### Two Admin Panels
1. **`/admin`** — Smart router page (auto-redirects based on auth)
2. **`/admin/login`** — Admin login (username/password)
3. **`/admin/dashboard`** — Admin panel (orders, users, purge tools)
4. **`/admin/crm`** — CRM leads management (separate full page)

### Admin Authentication Flow
1. **Login Page** (`/admin/login`):
   - Sends POST to `/api/admin/auth/login` with `userId` + `password`
   - Receives JWT token in response
   - Stores token in `localStorage.admin_token`

2. **API Endpoint** (`POST /api/admin/auth/login`):
   ```typescript
   const user = await User.findOne({ userId }); // Find by userId field (not email)
   const valid = await bcrypt.compare(password, user.password); // Verify hashed password
   const token = jwt.sign({ userId, email, isAdmin, role }, JWT_SECRET); // Sign JWT
   ```

3. **Root Router** (`/admin/page.tsx`):
   ```typescript
   const token = localStorage.getItem('admin_token');
   if (token) redirect('/admin/dashboard');
   else redirect('/admin/login');
   ```

### Admin User Schema (`lib/db.ts`)
```typescript
User {
  userId: String (required, unique) — 'admincrm'
  email: String (unique, sparse)
  password: String (hashed with bcrypt)
  isAdmin: Boolean (default: false)
  role: enum ['admin', 'user', 'moderator']
  createdAt, updatedAt: Date
}
```

### Creating Admin Users
Use the script: `node create-admin.js`
- Connects to MongoDB
- Creates user with `userId: 'admincrm'`, `isAdmin: true`
- Default password: **`Turya@#$4596`** (change after first login)
- Stores hashed password using bcrypt

### Admin Auth Endpoints
#### `POST /api/admin/auth/login`
- **Body:** `{ userId, password }`
- **Returns:** `{ success, token, user: { userId, email, isAdmin, role } }`
- **Errors:** 400 (missing fields), 401 (invalid creds), 403 (not admin), 500 (server)

#### Protected Admin Routes
All admin API routes check JWT and require `decoded.isAdmin`:
```typescript
const token = request.headers.get('authorization')?.slice('Bearer '.length);
const decoded = verifyToken(token);
if (!decoded?.isAdmin) return 401; // Only admins allowed
```

### Admin Dashboard Features (`/admin/dashboard`)
- **Stats Cards:** totalUsers, totalSignins, totalMessages, totalOrders, completed orders
- **Orders Table:** Lists recent orders with amount, currency, status
- **Currency Breakdown:** INR, USD, NPR totals
- **Purge Tool:** Delete old orders by email + date
- **Expire Tool:** Mark pending orders as expired after N minutes
- **Server Status Widget:** Real-time API health check

### Key Files
- **Pages:** `app/admin/{login,dashboard,crm}/page.tsx`
- **API Auth:** `app/api/admin/auth/login/route.ts`
- **CRM Routes:** `app/api/admin/crm/{leads,messages,templates,consent,labels}/`
- **Admin User Script:** `create-admin.js`
- **Sidebar Component:** `components/AdminSidebar.tsx`

### Important: JWT Token Storage
- **Client-side storage:** `localStorage.admin_token`
- **Header format:** `Authorization: Bearer <token>`
- **Duration:** 7 days (see `jwt.sign()` in login endpoint)
- **Token payload:** `{ userId, email, isAdmin, role }`

### Common Admin Gotchas
1. **userId ≠ email.** Admin login uses `userId` field (e.g., 'admincrm'), not email address.
2. **Password is hashed.** Always use bcrypt for verification; never store plaintext.
3. **Token expires in 7 days.** Users must re-login after expiration.
4. **isAdmin must be true.** Even if user exists, login fails if `isAdmin: false`.
5. **No automatic logout.** Token stays valid until expiration; clear localStorage manually.
6. **Protected routes check isAdmin.** Admin APIs reject any request without `decoded?.isAdmin`.
