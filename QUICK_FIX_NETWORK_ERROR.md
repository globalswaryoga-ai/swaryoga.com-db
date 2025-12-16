# ⚡ QUICK FIX: Life Planner Network Error

## 🎯 TL;DR (The Problem)
Backend can't connect to MongoDB → Life Planner shows "Network Error" on all pages

## 🔧 IMMEDIATE FIX (3 Steps)

### Option A: Use MongoDB Atlas (Recommended)
```bash
# Step 1: Create server/.env
cd /Users/mohankalburgi/Downloads/swar-yoga-latest-latest-prod-version/server
cat > .env << 'EOF'
MONGODB_URI=mongodb+srv://admin:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/swar-yoga-db?retryWrites=true&w=majority
PORT=4000
NODE_ENV=development
EOF

# Step 2: Restart backend
pm2 restart swar-backend

# Step 3: Verify
curl -H "X-User-ID: test" http://localhost:4000/api/visions
```

### Option B: Use Local MongoDB
```bash
# Step 1: Start local MongoDB
brew services start mongodb-community

# Step 2: Create server/.env
cat > server/.env << 'EOF'
MONGODB_URI=mongodb://localhost:27017/swar-yoga-db
PORT=4000
NODE_ENV=development
EOF

# Step 3: Restart backend
pm2 restart swar-backend
```

## ✅ How to Verify It's Fixed
1. Open `http://localhost:5173` in browser
2. Go to Life Planner
3. Should see "No visions yet" (not network error)
4. Can create new visions/goals/tasks

## 📍 Current Status

| Component | Status | Issue |
|-----------|--------|-------|
| Frontend (React) | ✅ Running on 5173 | None |
| Backend (Express) | ✅ Running on 4000 | Serving requests |
| MongoDB Connection | ❌ **FAILED** | **This is the issue** |
| API Routes | ⚠️ Ready | Waiting for DB connection |

## 🔗 Error Details
```
❌ MongoDB Connection Error: connect ECONNREFUSED 157.173.221.234:27017
```
**Translation:** Backend tried to connect to MongoDB at IP 157.173.221.234 but couldn't reach it.

---

**See NETWORK_ERROR_DIAGNOSIS.md for detailed explanation and troubleshooting**
