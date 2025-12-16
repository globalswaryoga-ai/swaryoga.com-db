# Life Planner Network Error - Root Cause & Solution

## 🔴 Problem Summary
Life Planner pages show **"Network Error"** when loading all components (Visions, Goals, Tasks, etc.)

---

## 🔍 Root Cause Analysis

### Issue 1: MongoDB Connection Failure
```
❌ MongoDB Connection Error: connect ECONNREFUSED 157.173.221.234:27017
```

**Why This Happens:**
- Backend server is **running** on localhost:4000 ✅
- Frontend is **serving** on localhost:5173 ✅
- **BUT** the backend cannot connect to MongoDB server at `157.173.221.234:27017`

**Why Connection Fails:**
1. **IP Address is a Remote Server** - Not MongoDB Atlas, but a custom hosted MongoDB server at IP `157.173.221.234`
2. **Network Connectivity Issue** - Your current network cannot reach that IP:
   - May be blocked by firewall
   - May be on different network
   - Server may be down or unreachable
   - IP whitelisting not configured

### Issue 2: Missing Environment Configuration
The server looks for `MONGODB_URI` in `server/.env` file, which **doesn't exist**:
```bash
# Current lookup in server/config/db.ts
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swar-yoga-db'
```

When `MONGODB_URI` is not set, it falls back to localhost (which also won't work without local MongoDB).

---

## ✅ Solutions

### Solution 1: Switch to MongoDB Atlas (Recommended for Cloud Deployment)
MongoDB Atlas is cloud-hosted and works from anywhere.

**Steps:**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free M0 cluster
3. Create a database user (e.g., `admin` / password)
4. Get connection string: `mongodb+srv://admin:password@cluster.mongodb.net/swar-yoga-db?retryWrites=true&w=majority`
5. Create `server/.env` file:
```bash
MONGODB_URI=mongodb+srv://admin:YOUR_PASSWORD@cluster.mongodb.net/swar-yoga-db?retryWrites=true&w=majority
PORT=4000
NODE_ENV=development
```
6. Restart backend: `pm2 restart swar-backend`

### Solution 2: Use Local MongoDB (Development Only)
If you have MongoDB installed locally:

```bash
# Start local MongoDB
brew services start mongodb-community

# Create server/.env
cat > server/.env << EOF
MONGODB_URI=mongodb://localhost:27017/swar-yoga-db
PORT=4000
NODE_ENV=development
EOF

# Restart backend
pm2 restart swar-backend
```

### Solution 3: Configure Access to Remote MongoDB (If you have the server IP)
If the server `157.173.221.234` is yours:

1. **Check if server is running:**
```bash
ping 157.173.221.234
nslookup 157.173.221.234
```

2. **Check if MongoDB service is running on that server:**
```bash
curl -v telnet://157.173.221.234:27017
```

3. **Update credentials in `server/.env`:**
```bash
MONGODB_URI=mongodb://admin:MySecurePass123@157.173.221.234:27017/?authSource=admin
PORT=4000
NODE_ENV=development
```

4. **Restart backend:**
```bash
pm2 restart swar-backend
pm2 logs swar-backend
```

---

## 📊 Verification Steps

### 1. Check Backend Connection
```bash
# Check backend logs
pm2 logs swar-backend

# Expected output if connected:
# ✅ MongoDB Connected: [server-address]
```

### 2. Test API Endpoint
```bash
# Test visions endpoint
curl -X GET http://localhost:4000/api/visions \
  -H "X-User-ID: test-user" \
  -H "Content-Type: application/json"

# Expected: {"success": true, "data": [...]}
# Not: Connection error or empty response
```

### 3. Check Frontend Console
```
Open http://localhost:5173 in browser
→ Press F12 (DevTools)
→ Console tab
→ Look for: "🔗 Using API URL: http://localhost:4000/api"
→ Check Network tab for failed requests to /api/visions
```

---

## 🛠️ Step-by-Step Fix (For MongoDB Atlas)

### Step 1: Create `.env` File
```bash
cd /Users/mohankalburgi/Downloads/swar-yoga-latest-latest-prod-version/server
cat > .env << 'EOF'
MONGODB_URI=mongodb+srv://admin:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/swar-yoga-db?retryWrites=true&w=majority
PORT=4000
NODE_ENV=development
EOF
```

### Step 2: Restart Backend
```bash
pm2 restart swar-backend
sleep 3
pm2 logs swar-backend --lines 20
```

### Step 3: Test API
```bash
curl -X GET http://localhost:4000/api/visions \
  -H "X-User-ID: test-user-123" \
  -H "Content-Type: application/json"
```

### Step 4: Test Frontend
1. Open browser: `http://localhost:5173`
2. Go to Life Planner page
3. Check if data loads (should show "No visions yet" if DB is empty)

---

## 🔐 Security Notes
- **Never commit `.env` with real credentials** to GitHub
- Store real credentials in Vercel environment variables
- Use `server/.env.example` as template
- Keep `MySecurePass123` credentials safe if using custom MongoDB server

---

## 📋 Files to Check/Create
```
server/.env                    ← CREATE THIS (with real MongoDB URI)
server/.env.example            ← Template (already exists)
server/config/db.ts            ← Reads MONGODB_URI (no changes needed)
src/utils/sadhakaPlannerData.ts ← API client (no changes needed)
src/pages/SadhakaPlannerPage.tsx ← Life Planner page (no changes needed)
```

---

## ⚠️ Common Mistakes to Avoid

| ❌ Wrong | ✅ Right |
|---------|----------|
| Store credentials in code | Store in `.env` file |
| Commit `.env` to GitHub | Add `.env` to `.gitignore` |
| Try to use non-existent server | Use MongoDB Atlas or local MongoDB |
| Restart only frontend | **Restart backend** after changing `.env` |
| Test with wrong endpoint | Test full URL: `http://localhost:4000/api/visions` |

---

## 📞 Next Steps

1. **Choose your MongoDB solution** (Atlas recommended)
2. **Create `server/.env`** with proper credentials
3. **Restart backend:** `pm2 restart swar-backend`
4. **Check logs:** `pm2 logs swar-backend`
5. **Test in browser** at `http://localhost:5173`

Once MongoDB connection is fixed, the "Network Error" will be gone, and Life Planner will work correctly!

---

**Status:** This is a **database connectivity issue**, not a frontend code issue.
**Solution Time:** 5-10 minutes for MongoDB Atlas setup, 2-3 minutes to apply credentials.

