# Swar Yoga Life Planner - AI Coding Agent Instructions

## Project Overview
**Swar Yoga** is a full-stack life planning & wellness application built with React 18 + TypeScript frontend and Express.js + MongoDB backend. It features multi-user data persistence, admin dashboard, and integrated booking/calendar features.

**Architecture:** Monorepo with `/src` (frontend) and `/server` (backend)  
**Key Tech:** React, Vite, Tailwind, Express.js, MongoDB Atlas, Vercel deployment

---

## Critical Architecture Patterns

### 1. **User Data Isolation via MongoDB + User ID Header**
All user data flows through a **X-User-ID header** system:
- Frontend extracts `userId` from `localStorage['user']` (set during SignIn in `AuthContext`)
- Every API request includes `X-User-ID` via axios interceptor in `src/utils/sadhakaPlannerData.ts` (lines 37-51)
- **Backend routes** filter MongoDB queries by `userId` to ensure isolation
- **Why:** Enables multi-user sync—same user on Device A/B sees identical data; different users see nothing

**File:** `src/utils/sadhakaPlannerData.ts` (725 lines) - primary data access layer for life planner features (visions, goals, tasks, health, etc.)

### 2. **Dual Authentication: User + Admin**
- **User Auth:** `src/context/AuthContext.tsx` — manages regular user login/signup, stores `localStorage['user']`
- **Admin Auth:** `src/context/AdminAuthContext.tsx` — centralized context for admin-only access, stores `localStorage['adminUser']`
- **Pattern:** Both contexts follow same structure—check localStorage on mount, provide hooks (`useAuth()`, `useAdminAuth()`)
- **Protected Routes:** `ProtectedAdminRoute` component in `src/App.tsx` redirects unauthenticated admins to `/admin-login`

**Key Insight:** Admin data uses same `X-User-ID` header system but with `adminUser` instead of `user`

### 3. **API Port Strategy**
- **Development:** Backend runs on `localhost:4000` (set in `ecosystem.config.cjs` and `sadhakaPlannerData.ts`)
- **Production:** API resolves to Vercel backend URL (`https://swar-yoga-dec1.vercel.app/api`)
- **Vite Proxy:** `vite.config.ts` includes proxy for `/api` → `http://localhost:4000` during dev
- **Common Pitfall:** Old code references port `3001` (deprecated); always use `4000` or Vercel URL

### 4. **Context Provider Nesting Order** (src/main.tsx)
```
AuthProvider
  → AdminAuthProvider  
    → CartProvider
      → AdminDataProvider
        → ThemeProvider
          → App
```
**Why:** AuthContext must wrap AdminAuthContext (admin needs user checks); CartProvider before AdminDataProvider (shopping features)

---

## Core API Routes & Data Models

### Backend Routes (all at `/api/[endpoint]`)
| Feature | Route | Model | User-Filtered |
|---------|-------|-------|----------------|
| Visions | `/visions` | `models/Vision.ts` | ✅ by userId |
| Goals | `/goals` | `models/Goal.ts` | ✅ |
| Tasks | `/tasks` | `models/Task.ts` | ✅ |
| Todos | `/todos` | `models/Todo.ts` | ✅ |
| Health | `/health` | `models/HealthTracker.ts` | ✅ |
| Daily Plans | `/dailyplans` | `models/DailyPlan.ts` | ✅ |
| Reminders | `/reminders` | `models/Reminder.ts` | ✅ |
| My Words | `/mywords` | `models/MyWord.ts` | ✅ |
| Milestones | `/milestones` | `models/Milestone.ts` | ✅ |
| Users | `/users` | `models/User.ts` | ✅ |
| Auth | `/auth` | Signup/Signin in `routes/auth.ts` | ❌ |
| Admin | `/admin` | `models/Admin.ts` | ✅ (by adminId) |
| Workshops | `/workshops` | `models/Workshop.ts` | ❌ (public) |
| Cart | `/carts` | `models/Cart.ts` | ✅ |
| Checkout | `/checkout` | `models/Checkout.ts` | ✅ |

### SadhakaPlannerData.ts Exports (Primary SDK)
This file is the **single source of truth** for all life planner operations:
```typescript
export const visionAPI = { list(), create(), update(), delete(), ... }
export const goalAPI = { ... }
export const taskAPI = { ... }
export const todoAPI = { ... }
export const healthAPI = { ... }
// ... and 6 more
```
**Always use these APIs** instead of direct fetch/axios calls for consistency.

---

## Developer Workflows

### Local Development Setup
```bash
# Terminal 1: Frontend (Vite dev server on port 5173)
npm run dev

# Terminal 2: Backend (Express on port 4000)
cd server && npm run start:ts
```
**Verify:** Open `http://localhost:5173` → check Console for `🔗 Using API URL: http://localhost:4000/api`

### Building & Deployment
```bash
npm run build       # Builds frontend to /dist, backend to /server/dist
npm start          # Starts server.js (production mode, serves dist)
```

### PM2 Process Management
```bash
pm2 start ecosystem.config.cjs   # Starts frontend (5173) + backend (4000)
pm2 logs swar-backend             # Tail backend logs
pm2 logs swar-frontend            # Tail frontend logs
```

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

### 4. **Styling: Tailwind + Lucide**
- All CSS via Tailwind utility classes (no separate .css files except `index.css`, `main.css`)
- Icons from `lucide-react` (e.g., `<Eye>`, `<Target>`, `<CheckCircle>`)
- Theme colors: Primary indigo (`text-indigo-600`, `bg-indigo-500`), grays for UI (`gray-100` to `gray-900`)

### 5. **SPA Routing**
- All routes in `src/App.tsx` via `<Routes>` + `<Route>`
- **Fallback:** `server.js` serves `index.html` for all unknown paths (SPA pattern)
- **No page-specific URLs** in API (e.g., `/admin/visions` → must be `/api/visions` with header-based filtering)

---

## Common Gotchas & Recent Fixes

### 1. **Data Disappears After Sign Out/In**
❌ **Root cause:** User ID not correctly detected when making API requests  
✅ **Fix:** `src/utils/sadhakaPlannerData.ts` lines 37-51—always extract from `localStorage['user']` object  
**Action:** When debugging persistence issues, check the X-User-ID header in network tab.

### 2. **Network Error When Adding Visions**
❌ **Root cause:** Backend port was 3001, frontend expected 4000  
✅ **Fix:** Changed all references to port 4000; updated `sadhakaPlannerData.ts`  
**Action:** Verify `API_URL` logs on app load—should show `http://localhost:4000/api` or Vercel URL.

### 3. **Admin Data Not Syncing Across Devices**
❌ **Root cause:** Admin requests didn't include user ID in header  
✅ **Fix:** Admin API calls now use same interceptor pattern as user API  
**Action:** For admin features, extract `localStorage['adminUser']` and pass as X-Admin-ID if needed.

### 4. **Build Failures on Vercel**
❌ **Root cause:** Missing `.env` variables (MONGODB_URI, API_URL)  
✅ **Fix:** Set environment variables in Vercel project settings  
**Action:** Before deploying, run `npm run build` locally to catch errors.

---

## Environment Variables

### Frontend (.env, .env.local, .env.production)
```
VITE_API_URL=https://swar-yoga-dec1.vercel.app/api  # Production only
```

### Backend (server/.env)
```
MONGODB_URI=mongodb+srv://[user]:[pass]@cluster.mongodb.net/swar-yoga-db
PORT=4000
NODE_ENV=production
```

**Never commit real credentials;** use `.env.example` as template.

---

## Deployment & Monitoring

### Current Deployment Setup
- **Frontend:** Vercel (auto-deploy on `main` branch)
- **Backend:** Runs via PM2 on server (auto-start via launchd on macOS)
- **Database:** MongoDB Atlas (cloud-hosted)

### Health Checks
- **Auto-start service:** `auto-start-service.sh` checks frontend/backend every 30 minutes
- **Logs:** `/logs/backend-out.log`, `/logs/frontend-out.log`
- **Restart threshold:** Max 10 restarts, min 10s uptime before restart counts

### Backup Schedule
- **Automatic:** Daily at midnight via `server/backup.ts`
- **Manual:** Admin can trigger via "Backup" button in admin dashboard
- **Restore:** Via admin panel or `/api/backup/restore` endpoint

---

## Additional Resources

- **Deployment reports:** `FINAL_DEPLOYMENT_REPORT.txt`, `DEPLOYMENT_SUMMARY_DEC_9_2025.txt`
- **Architecture docs:** `DATA_PERSISTENCE_AND_SYNC_FIX.txt`, `ADMIN_AUTH_CONTEXT_FIX.txt`
- **Fix history:** `SADHAKA_PLANNER_FIXES.txt`, `NETWORK_ERROR_ROOT_CAUSE_FIX.txt`

---

## Quick Troubleshooting

| Issue | Check |
|-------|-------|
| API 404 errors | Verify backend port 4000 is running; check `API_URL` in sadhakaPlannerData.ts |
| User data not persisting | Check localStorage['user'] exists after login; verify X-User-ID header in Network tab |
| Admin can't log in | Check AdminAuthContext provider in main.tsx; verify localStorage['adminUser'] JSON format |
| Build fails | Run `npm run lint` locally; check .env variables; ensure no TypeScript errors |
| MongoDB connection fails | Verify MONGODB_URI in .env; check IP whitelist on MongoDB Atlas; test connection string |

---

## Writing Code

### When adding a feature:
1. **Backend:** Add route in `server/routes/`, model in `server/models/`, type in database schema
2. **API SDK:** Add methods to appropriate API object in `src/utils/sadhakaPlannerData.ts`
3. **Component:** Use the API SDK, not direct axios
4. **State:** Use React hooks (`useState`, `useEffect`), not direct localStorage reads
5. **Testing:** Use `test-all-endpoints.sh` or Postman to verify API works with X-User-ID header

---

**Last Updated:** December 9, 2025 | **Status:** Production Deployment Complete
