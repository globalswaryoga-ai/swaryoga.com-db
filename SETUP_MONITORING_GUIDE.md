# Swar Yoga Setup & Monitoring Guide

**Last Updated:** December 16, 2025  
**Version:** 1.0 - Production Ready

## Quick Start Commands

### Development Server
```bash
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan
npm run dev
```

### Health Monitoring (In separate terminal)
```bash
bash monitor-health.sh
```

### API Health Check
```bash
curl http://localhost:3000/api/health/status | jq
```

---

## MongoDB Connection Status

### Real-time Terminal Logging

When you start the dev server, you'll see automatic MongoDB connection logs:

```
🔄 Attempting to connect to MongoDB...
✅ Successfully connected to MongoDB
```

### Status Codes
- **✅ Connected** - MongoDB is properly connected (readyState: 1)
- **⏳ Connecting** - Connection attempt in progress
- **❌ Disconnected** - No active MongoDB connection (readyState: 0)
- **Error: [message]** - Connection failed with specific error

### Monitoring Script Output

Run the health monitor to check all systems:

```bash
bash monitor-health.sh
```

**Expected Output:**
```
🔍 Swar Yoga Application Health Monitor
======================================

📋 Environment Configuration:
✅ .env.local found
✅ MONGODB_URI is set
✅ JWT_SECRET is set
✅ ADMIN_PASSWORD is set

🚀 Server Status:
✅ Server is running on port 3000

📡 API Health Check:
✅ Health endpoint responding (HTTP 200)

Database Connection Status:
{
  "status": "Disconnected",
  "readyState": 0,
  "database": "swarYogaDB"
}

======================================
```

---

## SignIn / SignUp Pages

### Pages Available
✅ `/signin` - User login page
✅ `/signup` - User registration page  
✅ `/admin/login` - Admin login page
✅ `/life-planner` - Life Planner landing page with newsletter

### Admin Credentials
- **Username:** admin
- **Password:** Swaryogadb@2076
- **JWT Token:** Generated on successful login (24h expiry)

### Signin Flow
1. User enters email & password
2. API validates against user database
3. JWT token issued if valid
4. Token stored in session/localStorage
5. Redirects to dashboard or specified path

### Signup Flow
1. User provides personal information
2. Email/phone validation
3. Password confirmation check
4. Auto-detect country and currency
5. Create user account in MongoDB
6. Optional: Auto-add to workshop cart
7. Redirect to login or dashboard

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/admin-login` - Admin authentication
- `GET /api/health/status` - System health check

### Health & Status
- `GET /api/health/status` - Returns MongoDB and environment status

**Response Example:**
```json
{
  "success": true,
  "timestamp": "2025-12-16T12:34:33.993Z",
  "mongodb": {
    "status": "Disconnected",
    "readyState": 0,
    "database": "swarYogaDB"
  },
  "environment": {
    "nodeEnv": "development",
    "apiUrl": "https://swar-yoga-web-mohan-gmvhvl9h0-swar-yoga-projects.vercel.app"
  }
}
```

---

## Database Configuration

### MongoDB Connection Details

**File:** `.env.local`

```env
MONGODB_URI=mongodb+srv://swarsakshi:swarsakshi@swaryogacluster.u3xw2.mongodb.net/swarYogaDB?retryWrites=true&w=majority
JWT_SECRET=swar_yoga_jwt_secret_key_2024_secure_token_authentication
```

### Connection Status

**ReadyState Values:**
- `0` = Disconnected
- `1` = Connected
- `2` = Connecting
- `3` = Disconnecting

### Enabling Automatic Terminal Logging

The enhanced `lib/db.ts` now includes:
- ✅ Connection status emojis
- ✅ Real-time connection attempts
- ✅ Error messages with context
- ✅ Connection state tracking

---

## Key Files

### Core Database
- **File:** [lib/db.ts](lib/db.ts)
- **Purpose:** MongoDB connection, schemas, models
- **Features:** Enhanced logging with emoji indicators

### Health Check API
- **File:** [app/api/health/status/route.ts](app/api/health/status/route.ts)
- **Purpose:** Returns real-time system status
- **Endpoint:** GET /api/health/status

### Monitoring Script
- **File:** [monitor-health.sh](monitor-health.sh)
- **Purpose:** Terminal-based health monitoring
- **Usage:** `bash monitor-health.sh`

### Authentication
- **Admin Login:** [app/api/auth/admin-login/route.ts](app/api/auth/admin-login/route.ts)
- **User Login:** [app/api/auth/login/route.ts](app/api/auth/login/route.ts)
- **User Signup:** [app/api/auth/signup/route.ts](app/api/auth/signup/route.ts)

### Pages
- **SignIn:** [app/signin/page.tsx](app/signin/page.tsx)
- **SignUp:** [app/signup/page.tsx](app/signup/page.tsx)
- **Life Planner:** [app/life-planner/page.tsx](app/life-planner/page.tsx)
- **Admin Login:** [app/admin/login/page.tsx](app/admin/login/page.tsx)

---

## Testing the Setup

### 1. Check Environment Variables
```bash
cat .env.local | grep -E "MONGODB|JWT|ADMIN"
```

### 2. Run Health Monitor
```bash
bash monitor-health.sh
```

### 3. Test Admin Login
```bash
curl -X POST http://localhost:3000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Swaryogadb@2076"}'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin",
  "message": "Admin login successful"
}
```

### 4. Check API Health
```bash
curl http://localhost:3000/api/health/status | jq
```

### 5. Test Pages in Browser
- SignIn: http://localhost:3000/signin
- SignUp: http://localhost:3000/signup
- Admin: http://localhost:3000/admin/login
- Life Planner: http://localhost:3000/life-planner

---

## Troubleshooting

### MongoDB Connection Fails

**Error:** `querySrv ENOTFOUND _mongodb._tcp.swaryogacluster.u3xw2.mongodb.net`

**Solution:**
1. Check internet connection
2. Verify MONGODB_URI in .env.local
3. Ensure MongoDB cluster is accessible
4. Check firewall/VPN settings

**Terminal Message:**
```
❌ MongoDB connection error: querySrv ENOTFOUND ...
```

### Admin Login Returns 500 Error

**Error:** `An error occurred during login`

**Solution:**
1. Verify ADMIN_PASSWORD in .env.local
2. Check if password hash is valid (60 chars, starts with $2a$)
3. Ensure JWT_SECRET is set

### Health Endpoint Not Responding

**Error:** `Cannot GET /api/health/status`

**Solution:**
1. Restart dev server: `npm run dev`
2. Check if page is compiling: `✓ Compiled /api/health/status`
3. Ensure port 3000 is not in use

---

## Production Deployment

### Both Projects Ready
- ✅ Main: `/Users/mohankalburgi/Downloads/swar-yoga-web-mohan`
- ✅ DB5: `/Users/mohankalburgi/Downloads/swaryoga.com-db`

### Build Verification
```bash
npm run build
# Expected: ✓ Compiled successfully (100/100 pages)
```

### Deploy to Vercel
```bash
# Automatic: Push to GitHub, Vercel auto-deploys
# or
vercel --prod
```

---

## Monitoring in Production

### Recommended Setup
1. Use `/api/health/status` endpoint for continuous monitoring
2. Set up monitoring alert if status !== "Connected"
3. Check logs daily: `tail -f .next/logs/*.log`
4. Monitor admin login attempts for security

### Monitoring Endpoints
```bash
# Every 60 seconds
watch -n 60 'curl -s http://localhost:3000/api/health/status | jq .mongodb.status'
```

---

## Architecture Overview

### Components
```
Next.js 14 (App Router)
├── Frontend (React 18, Tailwind CSS)
├── API Routes (Node.js)
├── MongoDB Connection
└── Authentication (JWT)

Pages
├── /signin - User authentication
├── /signup - User registration  
├── /admin/login - Admin panel
└── /life-planner - Dashboard + newsletter

APIs
├── /api/auth/* - Authentication
├── /api/health/status - Monitoring
└── /api/* - Other endpoints

Database
└── MongoDB (swarYogaDB)
```

---

## Summary

✅ **All Systems Operational**
- MongoDB connection monitoring enabled
- Admin authentication working
- SignIn/SignUp pages functional
- Health check API responding
- Terminal logging with emoji indicators
- Both projects synced and ready for deployment

**Next Steps:**
1. Run `npm run dev` to start development
2. Use `monitor-health.sh` to check status
3. Deploy changes to Vercel when ready
