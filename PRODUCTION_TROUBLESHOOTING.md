# Production Issue Resolution Guide

## Issue: POST /api/admin/workshops/schedules/crud returns 500 error

### 🔴 Error Details
```
POST https://swaryoga.com/api/admin/workshops/schedules/crud 500 (Internal Server Error)
```

---

## 🔍 Diagnosis Steps

### Step 1: Check Environment Variables on Production
Your hosting platform (Vercel/Self-hosted) must have these variables set:

**Critical Variables:**
- ✅ `MONGODB_URI` - Database connection string
- ✅ `JWT_SECRET` - Secret for admin token verification

**Payment Variables:**
- `PAYU_MERCHANT_KEY`
- `PAYU_MERCHANT_SALT`
- `PAYU_MODE`

**Social/External:**
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Step 2: Verify on Vercel (if using)
```
1. Go to Vercel Dashboard
2. Select project: swaryoga.com-db
3. Go to Settings → Environment Variables
4. Check that MONGODB_URI and JWT_SECRET are set
5. If missing, add them now
6. Redeploy
```

### Step 3: Verify Self-Hosted (if using PM2)
```bash
# Check environment file
cat .env

# Verify MONGODB_URI is set
echo $MONGODB_URI

# Verify JWT_SECRET is set
echo $JWT_SECRET

# If missing, edit .env and restart
npm run pm2:restart
```

### Step 4: Check Production Logs
```bash
# For Vercel: Check Function Logs in Dashboard
# For Self-hosted:
npm run pm2:logs

# Look for error messages like:
# [POST /api/admin/workshops/schedules/crud] Error: {
#   "message": "connect ENOAUTH authentication failed",
#   "timestamp": "2025-12-22T..."
# }
```

---

## 🛠️ Common Causes & Fixes

### Cause 1: Missing MONGODB_URI
**Error:** `MongoAuthenticationError` or `connect ENOTFOUND`

**Fix:**
```bash
# Verify connection string format:
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true

# In Vercel:
Settings → Environment Variables → Add MONGODB_URI
```

### Cause 2: Missing JWT_SECRET
**Error:** `Unauthorized` or `jwt malformed`

**Fix:**
```bash
# Generate secure secret (min 32 chars):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to environment:
Settings → Environment Variables → Add JWT_SECRET
```

### Cause 3: Admin Token Invalid
**Error:** Returns 401 before reaching database

**Fix:**
- Ensure JWT_SECRET matches between token generation and verification
- Logout and login again in admin panel
- Clear localStorage admin token

### Cause 4: Database Connection Timeout
**Error:** `MongooseError: Cannot connect to database`

**Fix:**
- Verify MongoDB IP whitelist includes production server IP
- Check MongoDB cluster status
- Verify MONGODB_URI hasn't changed

---

## ✅ Testing After Fix

### 1. Quick Connectivity Test
```bash
# Test if MongoDB connection works
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ DB Connected'))
  .catch(err => console.log('❌', err.message));
"
```

### 2. Test Admin Panel
```
1. Go to https://swaryoga.com/admin/workshops/schedules
2. Login with admin credentials
3. Try creating a schedule
4. Check browser console for errors
5. If 500 still shows, check production logs
```

### 3. Verify Database
```bash
# Check if schedule was saved (run locally with production MongoDB URI)
node check-database.js
```

---

## 📊 What Was Improved

Latest deployment (commit 646d416) includes:
- ✅ Enhanced error logging with stack traces
- ✅ Timestamp in error messages
- ✅ Better error context for debugging

This means production errors will show detailed information in logs.

---

## 🚀 Redeployment Steps

### For Vercel:
```
1. Go to Vercel Dashboard
2. Select Project
3. Go to Deployments
4. Click "Redeploy" on latest deployment
5. Or push a commit to main branch (auto-redeploy)
```

### For Self-Hosted:
```bash
cd /path/to/swar-yoga-web-mohan
git pull origin main
npm run build
npm run pm2:restart
npm run pm2:logs
```

---

## 📝 Checklist Before Going Live

- [ ] MONGODB_URI set on production
- [ ] JWT_SECRET set on production
- [ ] Application redeployed after adding env vars
- [ ] Admin can login without errors
- [ ] Can create a test schedule
- [ ] Schedule appears in database
- [ ] No 500 errors in browser console
- [ ] Production logs show no errors

---

## 🆘 If Issue Persists

1. **Check exact error message:**
   - Vercel: Functions → Logs
   - Self-hosted: `npm run pm2:logs | tail -100`

2. **Share error details:**
   - Full error message
   - Stack trace
   - Request payload
   - Environment variable names (values are secret)

3. **Verify:**
   - MongoDB cluster is running
   - IP whitelist includes your server
   - Credentials are correct
   - Network connectivity is working

---

## 📞 Support Resources

- MongoDB Docs: https://docs.mongodb.com/
- Vercel Docs: https://vercel.com/docs
- Next.js API Routes: https://nextjs.org/docs/api-routes
- Error Logs Location: Check Vercel Dashboard or PM2 logs

---

**Last Updated:** Dec 22, 2025 | **Commit:** 646d416
