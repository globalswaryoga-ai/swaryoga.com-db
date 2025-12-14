# Swar Yoga Web - AI Copilot Instructions

**Last Updated:** December 14, 2025  
**Framework:** Next.js 14 (App Router) + TypeScript + MongoDB + React 18

## Project Overview

A full-stack yoga e-commerce & life-planning platform with complex features: user authentication (JWT), accounting system, life planner with hierarchical data structures, calendar/panchang calculations, and payment integration (PayU).

**Key Sites:**
- Frontend: [app/](app/) - Next.js pages and components
- API: [app/api/](app/api/) - Route handlers using Next.js 14 server actions
- Models & Utilities: [lib/](lib/) - Database schemas, auth, helpers
- Types: [types/](types/) - TypeScript interfaces

## Architecture Patterns

### Database Layer (MongoDB + Mongoose)

**Location:** [lib/db.ts](lib/db.ts)

```typescript
// Pattern: Connection pooling with singleton pattern
export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  return await mongoose.connect(MONGODB_URI);
};

// Pattern: Always add indexes for frequently queried fields
userSchema.index({ email: 1 });
userSchema.index({ profileId: 1 });
userSchema.index({ createdAt: -1 });
```

**Critical Performance Rules:**
- Use `.lean()` on read-only queries for 2-3x speedup
- Use `.select()` to limit returned fields
- Add compound indexes for multi-field queries: `schema.index({ field1: 1, field2: -1 })`
- Use `.limit()` on large result sets to prevent memory issues
- Avoid N+1 queries; use aggregation pipelines for complex stats

**Models in use:** User, Order, Contact, Offer, Account, Transaction, Investment, Batch, Enquiry, Vision, Message, Treatment, Workshop

### Authentication & Authorization

**Location:** [lib/auth.ts](lib/auth.ts) + [app/api/auth/](app/api/auth/)

```typescript
// Pattern: JWT with verifyToken middleware
const decoded = verifyToken(token);
if (!decoded?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// Pattern: Owner-based access control
const getUserOwner = (request: NextRequest) => {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  return { ownerType: decoded?.isAdmin ? 'admin' : 'user', ownerId: decoded?.userId };
};
```

**Rules:**
- All protected API routes must verify JWT from `Authorization: Bearer <token>` header
- Use `ownerType` + `ownerId` for document-level access control (see [app/api/accounting/accounts/route.ts](app/api/accounting/accounts/route.ts))
- Admin routes check `isAdmin` flag in token payload

### API Response Pattern

**Standard structure** (used across all API routes):

```typescript
// Success
NextResponse.json({ success: true, data: {...} }, { status: 200 })

// Error
NextResponse.json({ error: 'message' }, { status: 4xx | 5xx })
```

**Response Optimization:**
- Add `Cache-Control: public, s-maxage=300` for GET endpoints (300s cache)
- Use [lib/cacheManager.ts](lib/cacheManager.ts) for in-app caching on expensive queries
- Add rate limiting with [lib/rateLimit.ts](lib/rateLimit.ts) for expensive operations

### Component Architecture

**Pattern: Client components with server API integration**

```typescript
// app/admin/accounting/page.tsx
'use client'; // All interactive pages are client components

const [data, setData] = useState([]);
useEffect(() => {
  const headers = { 'Authorization': `Bearer ${token}` };
  fetch('/api/admin/accounting/accounts', { headers })
    .then(r => r.json())
    .then(r => setData(r.data));
}, []);
```

**Rules:**
- Use `'use client'` for interactive pages, `'use server'` for API routes
- Always pass JWT token in Authorization header for protected endpoints
- Handle loading/error states explicitly (see [components/EnhancedVisionModal.tsx](components/EnhancedVisionModal.tsx))

### Complex Features

**Life Planner Hierarchical Storage:** [lib/lifePlannerMongoStorage.ts](lib/lifePlannerMongoStorage.ts)
- Vision → Milestones → Goals → Tasks → Todos → Words structure
- Full hierarchical save/restore from MongoDB
- Atomic operations: entire vision tree saved as single document

**Calendar & Panchang Calculations:** [lib/panchang.ts](lib/panchang.ts) + [lib/calendarCalculations.ts](lib/calendarCalculations.ts)
- Uses `@bidyashish/panchang` library for Hindu calendar calculations
- Location-based calculations (latitude/longitude from [lib/globalLocationData.ts](lib/globalLocationData.ts))
- Caches results to avoid expensive recalculations

**Accounting System:** [app/admin/accounting/](app/admin/accounting/)
- Double-entry bookkeeping with Account → Transaction model
- Investment tracking with recurring reminders
- Monthly/quarterly/yearly report generation (see [lib/accountingReportPeriod.ts](lib/accountingReportPeriod.ts))

## Development Workflows

### Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (copy from .env.local template)
# MONGODB_URI, JWT_SECRET, NEXT_PUBLIC_API_URL required

# 3. Start development server
npm run dev    # Runs on http://localhost:3000

# 4. Build & test
npm run build
npm run lint
npm run type-check
```

### Adding New API Routes

1. Create file at `app/api/[feature]/route.ts`
2. Import `connectDB` and models from `lib/db.ts`
3. Verify JWT if protected: use `verifyToken()` from `lib/auth.ts`
4. Apply `.lean()`, `.select()`, `.limit()` to queries
5. Return standard JSON response structure
6. Add error logging for debugging

**Example:** [app/api/accounting/accounts/route.ts](app/api/accounting/accounts/route.ts)

### Adding New Pages

1. Create `app/[route]/page.tsx` with `'use client'` directive
2. Import Navigation & Footer components
3. Add loading/error states with useState/useEffect
4. Fetch data from `/api/` endpoints with JWT if needed
5. Use Tailwind classes with yoga theme colors (`yoga-50` through `yoga-700`)

### Database Modifications

1. Update schema in [lib/db.ts](lib/db.ts)
2. Add indexes immediately: `schema.index({ field: 1 })`
3. Add corresponding API route(s) in [app/api/](app/api/)
4. Test with `.lean()` and `.select()` on reads
5. Document in MongoDB comment: connection string, cluster name, database name

## Critical Files Reference

| File | Purpose |
|------|---------|
| [lib/db.ts](lib/db.ts) | All MongoDB schemas & connection |
| [lib/auth.ts](lib/auth.ts) | JWT utilities (generate, verify token) |
| [next.config.js](next.config.js) | Workshop URL overrides, environment loading |
| [tailwind.config.js](tailwind.config.js) | Yoga color theme definitions |
| [tsconfig.json](tsconfig.json) | Path alias `@/*` → root directory |
| [PERFORMANCE_BUG_ANALYSIS.md](PERFORMANCE_BUG_ANALYSIS.md) | 12 known issues & fixes |
| [DATABASE_OPTIMIZATION.md](DATABASE_OPTIMIZATION.md) | Query optimization guide |

## Known Issues & Fixes

**Performance Bottlenecks:**
1. Missing database indexes → Add to `lib/db.ts` schema definitions
2. N+1 queries in dashboard → Use aggregation pipelines
3. Synchronous file I/O → Replace `readFileSync` with async `readFile`
4. No API response caching → Implement with [lib/cacheManager.ts](lib/cacheManager.ts)

See [PERFORMANCE_BUG_ANALYSIS.md](PERFORMANCE_BUG_ANALYSIS.md) for complete list with code examples.

## Type System

**Key types in [types/](types/):**
- `Vision`, `Goal`, `Task`, `Todo`, `Word` - Life planner hierarchy
- `Account`, `Transaction`, `Investment` - Accounting system
- `Order`, `User`, `Contact` - E-commerce core
- `Batch`, `Workshop` - Yoga courses
- `CalendarData`, `LocationData` - Panchang system

**Rules:**
- Always use interfaces for API request/response bodies
- Enums for fixed sets: `type: 'bank' | 'cash' | 'investment' | 'loan'`
- Use `NextRequest`, `NextResponse` for API types (not generic Request/Response)
- Optional fields: mark with `?`, don't use `| undefined`

## Environment Variables

**Required for development (.env.local):**
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<32+ char string>
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
PAYU_MERCHANT_KEY=...
PAYU_MERCHANT_SALT=...
```

**Never commit:** `.env.local`, credentials, API keys. Use `.env.example` as template.

## Testing & Validation

**Query validation patterns:**
```typescript
// Always validate required fields before DB operations
const missingFields = [];
if (!email?.trim()) missingFields.push('email');
if (!password?.trim()) missingFields.push('password');
if (missingFields.length > 0) {
  return NextResponse.json(
    { error: `Missing: ${missingFields.join(', ')}` },
    { status: 400 }
  );
}

// Use bcryptjs for password hashing (see signup route)
const hashedPassword = await bcrypt.hash(password, 10);
```

**Manual testing scripts available:**
- [test-api.js](test-api.js) - Test API endpoints
- [test-mongodb.js](test-mongodb.js) - Test database connectivity
- [diagnose-login-error.sh](diagnose-login-error.sh) - Debug auth issues

---

**When unclear:** Check existing implementations in [app/api/](app/api/) and [components/](components/) as reference patterns. Read [PERFORMANCE_BUG_ANALYSIS.md](PERFORMANCE_BUG_ANALYSIS.md) for context on why certain patterns are used.
