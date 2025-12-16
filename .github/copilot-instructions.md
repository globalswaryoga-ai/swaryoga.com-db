# Swar Yoga Life Planner - AI Coding Agent Instructions

**Framework:** React 18 + Vite (frontend) + Express.js (backend) + MongoDB  
**Last Updated:** December 16, 2025  
**Status:** Production Deployment Complete (Vercel + MongoDB Atlas)

**Note:** Two versions of this project exist:
- **swar-yoga-web-mohan** (this project) - React/Vite/Express monorepo
- **swaryoga.com-db** (separate) - Next.js 14 full-stack app

---

## Project Overview

**Swar Yoga** is a full-stack life planning & wellness platform for yoga practitioners. Features include:
- **Life Planner:** Hierarchical vision → goals → tasks → todos management
- **Multi-user persistence:** Each user's data isolated via MongoDB + X-User-ID header
- **Admin dashboard:** Advanced accounting, reporting, user management
- **Booking & Calendar:** Swar yoga calendar with suncalc library for celestial calculations
- **E-commerce:** Shopping cart, checkout, workshop enrollment

**Key Architecture:**
- Frontend: React 18 + TypeScript in `/src`, built with Vite
- Backend: Express.js in `/server`, API routes in `/server/routes/`
- Serverless API: `/api` folder contains Vercel serverless function handlers
- Database: MongoDB Atlas with Mongoose schemas
- Deployment: Vercel (full-stack) — frontend serves `/dist`, API uses serverless functions

---

## Critical Architecture Patterns

### 1. **User Data Isolation via MongoDB + User ID Header**
All user data flows through a **X-User-ID header** system:
- Frontend extracts `userId` from `localStorage['user']` (set during SignIn in `AuthContext`)
- Every API request includes `X-User-ID` via axios interceptor in `src/utils/sadhakaPlannerData.ts` (lines 37-51)
- **Backend routes** filter MongoDB queries by `userId` to ensure isolation
- **Why:** Enables multi-user sync—same user on Device A/B sees identical data; different users see nothing

**File:** `src/utils/sadhakaPlannerData.ts` (794 lines) - primary data access layer for life planner features (visions, goals, tasks, health, etc.)

### 2. **Dual Authentication: User + Admin**
- **User Auth:** `src/context/AuthContext.tsx` — manages regular user login/signup, stores `localStorage['user']`
- **Admin Auth:** `src/context/AdminAuthContext.tsx` — centralized context for admin-only access, stores `localStorage['adminUser']`
- **Pattern:** Both contexts follow same structure—check localStorage on mount, provide hooks (`useAuth()`, `useAdminAuth()`)
- **Protected Routes:** `ProtectedAdminRoute` component in `src/App.tsx` redirects unauthenticated admins to `/admin-login`

**Key Insight:** Admin data uses same `X-User-ID` header system but with `adminUser` instead of `user`

### 3. **API Architecture: Serverless Functions on Vercel**
- **Development:** Backend runs on `localhost:3000` via `cd server && npx tsx server.ts`
- **Production:** API served as Vercel serverless functions from `/api` folder
  - Vercel routes all `/api/*` requests to `api/[...path].js` (Express app in serverless handler)
  - `vercel.json` rewrites `/api/(.*)` → `/api/[...path].js`
  - Maximum timeout: 60 seconds per function
- **Vite Proxy:** `vite.config.ts` includes proxy `/api` → `http://localhost:3000` during dev (mirrors prod structure)
- **URL Resolution:** `sadhakaPlannerData.ts` auto-detects environment:
  - Development: `http://localhost:3000/api`
  - Production: `/api` (relative path, Vercel routes correctly)

### 4. **Context Provider Nesting Order** (src/main.tsx)
```
BrowserRouter
  → AuthProvider
    → AdminAuthProvider  
      → AdminProvider
        → App + ToastContainer
```
**Why:** AuthContext must be available first (admin needs user checks); AdminAuthProvider provides admin context; AdminProvider wraps both

---

## Core API Routes & Data Models

### Available Backend Routes (26 endpoints total)
All routes are at `/api/[endpoint]` and filtered by `X-User-ID` header (except public routes):

| Endpoint | Filtered | Purpose |
|----------|----------|---------|
| `/auth` | ❌ | Signup/signin (creates JWT in localStorage) |
| `/users` | ✅ | User profile, preferences, account data |
| `/visions` | ✅ | Life visions (top of hierarchy) |
| `/goals` | ✅ | Goals linked to visions |
| `/tasks` | ✅ | Tasks linked to goals |
| `/todos` | ✅ | Daily todos linked to tasks |
| `/mywords` | ✅ | Inspirational words/quotes user saves |
| `/health` | ✅ | Health tracker (sleep, exercise, diet) |
| `/dailyplans` | ✅ | Daily plan entries |
| `/reminders` | ✅ | User reminders |
| `/milestones` | ✅ | Milestone tracking |
| `/carts` | ✅ | Shopping cart items |
| `/checkout` | ✅ | Checkout orders |
| `/accounting` | ✅ | Financial transactions & reports |
| `/admin` | ✅ | Admin-only operations |
| `/admin/mongo` | ✅ | MongoDB admin tools |
| `/workshops/public` | ❌ | Public workshop listings |
| `/contact` | ❌ | Contact form submissions |
| `/pagestate` | ✅ | Save UI state (page scroll, tabs, filters) |
| `/assignment` | ✅ | Workshop/course assignments |
| `/enrollment` | ✅ | Workshop enrollments |
| `/student-progress` | ✅ | Student progress tracking |
| `/payment` | ✅ | Payment processing |
| `/zoom-meeting` | ✅ | Zoom meeting integration |
| `/chat` | ✅ | Chat messages between users |

**Key Rule:** Backend extracts `userId` from `X-User-ID` header automatically and filters all queries. If header missing → request rejected with 401.

### Mongoose Models in `/server/models/`
- `User.ts` - User accounts, auth, preferences
- `Vision.ts`, `Goal.ts`, `Task.ts`, `Todo.ts`, `MyWord.ts` - Life planner hierarchy
- `HealthTracker.ts` - Health data
- `DailyPlan.ts`, `Reminder.ts`, `Milestone.ts` - Planning features
- `Cart.ts`, `Checkout.ts` - E-commerce
- `Transaction.ts`, `Account.ts` - Accounting system
- `Workshop.ts`, `Assignment.ts` - Workshop/course management
- `AdminUser.ts` - Admin-only accounts

### SadhakaPlannerData.ts - Frontend API SDK (794 lines)
**Location:** `src/utils/sadhakaPlannerData.ts` — the **single source of truth** for all data access

```typescript
// Exports for each feature:
export const visionAPI = { list(), create(), update(), delete(), ... }
export const goalAPI = { ... }
export const taskAPI = { ... }
export const todoAPI = { ... }
export const healthAPI = { ... }
export const reminderAPI = { ... }
export const mywordAPI = { ... }
export const dailyplanAPI = { ... }
export const milestoneAPI = { ... }
export const userAPI = { ... }
export const accountingAPI = { ... }
```

**Critical Pattern:** Always use these API objects instead of direct axios calls:
- Automatically injects `X-User-ID` header from `localStorage['user']` (lines 37-51)
- Handles errors with localStorage fallback (offline mode support)
- Caches responses locally for faster subsequent loads
- Auto-detects environment (localhost:4000 vs. production Vercel URL)

**Example Usage:**
```typescript
const visions = await visionAPI.list();  // Fetches all user visions
const newVision = await visionAPI.create({ title: 'Learn Yoga' });
await visionAPI.update(id, { title: 'Advanced Yoga' });
await visionAPI.delete(id);
```

---

## Developer Workflows

### Local Development Setup
```bash
# Terminal 1: Frontend (Vite dev server on port 5173)
npm run dev

# Terminal 2: Backend (Express on port 3000)
cd server && npx tsx server.ts
```
**Verify:** Open `http://localhost:5173` → check Console for `🔗 Using API URL: http://localhost:3000/api`

### Building & Deployment
```bash
npm run build       # Builds frontend to /dist, backend to /server/dist
npm start          # Starts server.js (production mode, serves dist)
```

### PM2 Process Management (Development/Local Server)
```bash
pm2 start ecosystem.config.cjs   # Starts frontend (5173) + backend (3000)
pm2 logs swar-backend             # Tail backend logs
pm2 logs swar-frontend            # Tail frontend logs
pm2 stop all                       # Stop all services
```
**Note:** PM2 is for local development only; production uses Vercel serverless functions

### Testing API Endpoints
Shell scripts in root (e.g., `test-api.py`, `test-all-endpoints.sh`) provide curl-based testing.
**Tip:** All requests need `X-User-ID` header; use test scripts or Postman with headers set.

### Database & Backups
- **MongoDB Atlas:** Primary database (URI in `.env`)
- **Daily backups:** Automated via `server/backup.ts` (runs at midnight)
- **Admin backups:** Triggered by `server/adminBackup.ts` on logout
- **Restore:** Endpoint `/api/backup/restore` (requires valid backup filename)

---

## Component Hierarchy & File Locations

### Page Structure
- **Public pages** (no auth): `src/pages/{HomePage, AboutPage, Blog, Workshop, Resort, Contact}`
- **User pages** (login required): `src/pages/{SadhakaPlannerPage, SwarCalendar, CartPage}`
- **Admin pages** (admin login required): `src/pages/admin/{AdminDashboard, AdminSigninData, AdminAccounting, CertificateCreator}`

### Key Page Files & Their Purpose
| File | Purpose | Uses API |
|------|---------|----------|
| `SadhakaPlannerPage.tsx` | Main life planner hub—tabs for visions, goals, tasks, health | ✅ sadhakaPlannerData.ts |
| `SwarCalendar.tsx` | Swar Yoga calendar (sunrises, celestial data via suncalc) | ❌ (suncalc library) |
| `AdminAccounting.tsx` | Financial tracking for admins | ✅ accountingAPI |
| `UserAccount.tsx` | User profile, order history, preferences | ✅ userAPI |

### Component Patterns
- **Form components** (`GoalForm`, `VisionForm`): Use local state + manual API calls, emit on save
- **List components** (`GoalsComponent`, `TasksComponent`): Load on mount, refresh on create/delete, map API response to state
- **Dashboard components** (`Dashboard.tsx`): Aggregate multiple APIs, track loading + errors

**Common Hook:** `useAuth()` + `useNavigate()` for redirects on logout

---

## Project-Specific Conventions

### 1. **API Error Handling**
All APIs include fallback to `localStorage` if backend unavailable:
```typescript
// sadhakaPlannerData.ts pattern
try {
  const response = await apiClient.get('/visions');
  return response.data;
} catch (error) {
  console.error('Error fetching visions:', error);
  // Fallback to localStorage cache
  return JSON.parse(localStorage.getItem('cached_visions') || '[]');
}
```
**Why:** Enables app to work offline; always cache successful API responses.

### 2. **User ID Detection (Critical Fix)**
```typescript
// In interceptors - MUST extract from localStorage['user'] object
const userStr = localStorage.getItem('user');
const userObj = JSON.parse(userStr);
const userId = userObj.id || userObj._id;  // Both fields may exist
```
**Pitfall:** Old code looked for `localStorage['userId']` (doesn't exist); always parse the `user` object.

### 3. **Type Definitions**
All data models defined in `src/utils/sadhakaPlannerData.ts` (exports Vision, Goal, Task, etc. interfaces).
**When adding new feature:** 
1. Define interface at top of file
2. Add API methods to export object
3. Update backend route in `server/routes/[feature].ts`
4. Ensure TypeScript compilation: `npm run build`

### 4. **Styling: Tailwind + Lucide**
- All CSS via Tailwind utility classes (no separate .css files except `index.css`, `main.css`)
- Icons from `lucide-react` (e.g., `<Eye>`, `<Target>`, `<CheckCircle>`)
- Theme colors: Primary indigo (`text-indigo-600`, `bg-indigo-500`), grays for UI (`gray-100` to `gray-900`)

### 5. **SPA Routing**
- All routes in `src/App.tsx` via `<Routes>` + `<Route>`
- **Fallback:** `server.js` serves `index.html` for all unknown paths (SPA pattern)
- **No page-specific URLs** in API (e.g., `/admin/visions` → must be `/api/visions` with header-based filtering)

### 6. **Vision Schema Alignment (Recent Fix)**
Recent commits aligned the Vision model with MongoDB validation:
- `visualImageUrl` (renamed from `imageUrl`)
- `visionStatement`, `affirmations`, `category`, `timeFrame` fields added
- Frontend interface in `sadhakaPlannerData.ts` updated to match backend
- Always verify TypeScript compilation after schema changes

---

## Common Gotchas & Recent Fixes

### 1. **Data Disappears After Sign Out/In**
❌ **Root cause:** User ID not correctly detected when making API requests  
✅ **Fix:** `src/utils/sadhakaPlannerData.ts` lines 37-51—always extract from `localStorage['user']` object  
**Action:** When debugging persistence issues, check the X-User-ID header in network tab.

### 2. **Network Error When Adding Visions**
❌ **Root cause:** Backend port was 3000 previously, then 3001, now standardized to 4000  
✅ **Fix:** All references now use port 4000; updated `sadhakaPlannerData.ts`  
**Action:** Verify `API_URL` logs on app load—should show `http://localhost:4000/api` or Vercel URL.

### 3. **Admin Data Not Syncing Across Devices**
❌ **Root cause:** Admin requests didn't include user ID in header  
✅ **Fix:** Admin API calls now use same interceptor pattern as user API  
**Action:** For admin features, extract `localStorage['adminUser']` and pass correctly.

### 4. **Build Failures on Vercel**
❌ **Root cause:** Missing `.env` variables (MONGODB_URI, API_URL)  
✅ **Fix:** Set environment variables in Vercel project settings  
**Action:** Before deploying, run `npm run build` locally to catch errors.

### 5. **TypeScript Errors After Schema Updates**
❌ **Root cause:** Frontend types don't match backend Mongoose schema
✅ **Fix:** Latest commit (Dec 10) aligned Vision schema — update both `server/models/Vision.ts` and `src/utils/sadhakaPlannerData.ts` interfaces
**Action:** Run `npm run lint` and verify no TypeScript errors before committing.

---

## Environment Variables

### Frontend (.env)
```
NODE_ENV=development  # Development only; use 'production' for builds
VITE_API_URL=http://localhost:4000/api  # Dev: localhost, Production: leave empty (uses relative /api)
```

### Backend (server/.env)
```
MONGODB_URI=mongodb+srv://[user]:[pass]@cluster.mongodb.net/swar-yoga-db
PORT=4000
NODE_ENV=development
```

**Never commit real credentials;** use `.env.example` as template.

---

## Deployment & Monitoring

### Current Deployment Setup
- **Frontend:** Vercel (auto-deploy on `main` branch to `dist/` output)
- **Backend API:** Vercel serverless functions (`/api` folder)
  - Routes compiled from `server/routes/*.ts` and bundled into `/api/[...path].js`
  - Each function has 60-second max duration
- **Database:** MongoDB Atlas (cloud-hosted)
- **Build process:** `npm run build` compiles frontend to `/dist` and backend to `/server/dist`
- **Live Deployment:** https://swar-yoga-web-mohan-eykoa9s5x-swar-yoga-projects.vercel.app/

### Local Testing Before Deployment
```bash
# Verify both services run locally
npm run dev                    # Frontend on port 5173
cd server && npx tsx server.ts # Backend on port 4000 (in another terminal)

# Run build to catch errors
npm run build                  # Must succeed before deploying
npm run lint                   # Check for linting issues
```

### Vercel Configuration
- **vercel.json** defines:
  - API rewrites: `/api/(.*)` → `/api/[...path].js`
  - SPA fallback: `/(.*)`  → `/index.html`
  - Function timeout: 60 seconds per endpoint
- **Build command:** `npm ci && npm run build`
- **Output directory:** `dist/`

### Health Checks
- **Frontend:** Vercel provides automatic uptime monitoring
- **API:** Test key endpoints from browser dev tools or `test-all-endpoints.sh`
- **Database:** MongoDB Atlas alerts on connection issues
- **Endpoint:** `/api/health` for status checks (if implemented)

### Backup Schedule
- **Automatic:** Daily at midnight via `server/backup.ts`
- **Manual:** Admin can trigger via "Backup" button in admin dashboard
- **Restore:** Via admin panel or `/api/backup/restore` endpoint
- **Storage:** Backups stored in `/backups/mongodb/` directory locally; exported to `.json` format

---

## Testing & API Verification

### Local API Testing
```bash
# Using provided test scripts
python test-api.py                    # Python-based API tests
bash test-all-endpoints.sh            # Shell script covering all routes

# Manual testing with curl
curl -X GET http://localhost:4000/api/visions \
  -H "X-User-ID: your-user-id" \
  -H "Content-Type: application/json"
```

### Critical Headers Required
- **X-User-ID:** User identifier (set automatically by sadhakaPlannerData.ts interceptor)
- **X-Admin-ID:** Admin identifier (when testing admin endpoints)
- **Content-Type:** `application/json` (for POST/PUT requests)

---

## Additional Resources

- **Deployment reports:** `FINAL_DEPLOYMENT_REPORT.txt`, `DEPLOYMENT_SUMMARY_DEC_9_2025.txt`
- **Architecture docs:** `DATA_PERSISTENCE_AND_SYNC_FIX.txt`, `ADMIN_AUTH_CONTEXT_FIX.txt`
- **Fix history:** `SADHAKA_PLANNER_FIXES.txt`, `NETWORK_ERROR_ROOT_CAUSE_FIX.txt`
- **GitHub Repositories:**
  - Main Project: https://github.com/globalswaryoga-ai/swar-yoga-web-mohan
  - DB5 Project (Next.js): https://github.com/globalswaryoga-ai/swaryoga.com-db

---

## Quick Troubleshooting

| Issue | Check |
|-------|-------|
| API 404 errors | Verify backend running on 4000; check `API_URL` logs on app load |
| User data not persisting | Check localStorage['user'] exists after login; verify X-User-ID header in Network tab |
| Admin can't log in | Check AdminAuthContext provider in main.tsx; verify localStorage['adminUser'] JSON format |
| Build fails | Run `npm run lint` locally; check .env variables; ensure no TypeScript errors |
| MongoDB connection fails | Verify MONGODB_URI in .env; check IP whitelist on MongoDB Atlas; test connection string |
| Vision schema type errors | Verify `visualImageUrl` field exists in backend Vision.ts and frontend interface |

---

## Writing Code

### When adding a feature:
1. **Backend:** Add route in `server/routes/`, model in `server/models/`, type in database schema
2. **API SDK:** Add methods to appropriate API object in `src/utils/sadhakaPlannerData.ts`
3. **Component:** Use the API SDK, not direct axios
4. **State:** Use React hooks (`useState`, `useEffect`), not direct localStorage reads
5. **Testing:** Use `test-all-endpoints.sh` or Postman to verify API works with X-User-ID header
6. **TypeScript:** Run `npm run build` to verify no compilation errors

---

**Last Updated:** December 16, 2025 | **Status:** Production Deployment Complete
