# 🔍 How to Check if MongoDB is Running

**Date:** December 12, 2025  
**Focus:** Verify MongoDB connection and status

---

## 🎯 QUICK ANSWER

For your setup (MongoDB Atlas cloud), you need to check:
1. ✅ MongoDB Atlas service is running (online)
2. ✅ Your IP is whitelisted
3. ✅ Connection string is correct
4. ✅ Database credentials are valid

---

## ✅ METHOD 1: Check Server Console (Easiest)

When you run your dev server, look for this message:

**Success:**
```
✓ Connected to MongoDB
```

**Failure:**
```
❌ MongoDB connection error: Could not connect to any servers
```

**How to do it:**
```bash
# In terminal
npm run dev

# Watch the console output
# Look for "Connected to MongoDB" message
```

---

## ✅ METHOD 2: Test Connection with Test Script

Create a test file to verify MongoDB connection:

**File:** `test-mongodb.js`

```javascript
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ MONGODB_URI is not set');
  process.exit(1);
}

console.log('🔄 Testing MongoDB connection...');
console.log('URI (first 50 chars):', mongoUri.substring(0, 50) + '...');

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ MongoDB connection successful!');
    console.log('   Status: Connected to MongoDB Atlas');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ MongoDB connection failed!');
    console.error('Error:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('Could not connect')) {
      console.error('\n💡 Common causes:');
      console.error('   1. Your IP is not whitelisted in MongoDB Atlas');
      console.error('   2. Database credentials are wrong');
      console.error('   3. MongoDB cluster is paused');
      console.error('\n🔧 Fix: Add your IP to MongoDB Atlas Network Access');
      console.error('   curl ifconfig.me  (get your IP)');
      console.error('   Then add to: MongoDB Atlas > Network Access > Add IP');
    }
    
    process.exit(1);
  });
```

**Run it:**
```bash
node test-mongodb.js
```

**Expected Output (Success):**
```
🔄 Testing MongoDB connection...
URI (first 50 chars): mongodb+srv://username:pass@cluster.mongodb...
✅ MongoDB connection successful!
   Status: Connected to MongoDB Atlas
```

**Expected Output (Failure):**
```
🔄 Testing MongoDB connection...
URI (first 50 chars): mongodb+srv://username:pass@cluster.mongodb...
❌ MongoDB connection failed!
Error: Could not connect to any servers...

💡 Common causes:
   1. Your IP is not whitelisted in MongoDB Atlas
   2. Database credentials are wrong
   3. MongoDB cluster is paused
```

---

## ✅ METHOD 3: Check MongoDB Atlas Web Dashboard

**For MongoDB Atlas (Cloud):**

1. **Go to MongoDB Atlas:**
   - https://account.mongodb.com/account/login
   - Login with your credentials

2. **Check Cluster Status:**
   - Look for your cluster
   - Should show green "Running" indicator
   - If gray or paused, click "Resume"

3. **Check Network Access:**
   - Click "Network Access" in left menu
   - Verify your IP is in the whitelist
   - If not, click "Add IP Address"

4. **Check Cluster Metrics:**
   - Click "Metrics" tab
   - Should show activity
   - If no activity, cluster might not be receiving connections

**Visual Checklist:**
```
MongoDB Atlas Dashboard
├─ Cluster Status: 🟢 Running (not ⚪ Paused)
├─ Network Access: Your IP is whitelisted
├─ Metrics: Showing connection attempts
└─ Connection String: Can be copied
```

---

## ✅ METHOD 4: Use mongosh CLI (If Installed)

**If you have MongoDB tools installed locally:**

```bash
# Connect to MongoDB Atlas
mongosh "mongodb+srv://username:password@cluster.mongodb.net/database_name"
```

**Expected Output (Success):**
```
Connecting to:          mongodb+srv://[username]@[cluster]...
Using MongoDB:          7.0.0
Using Mongosh:          2.0.0

test> 
```

**To verify connection:**
```javascript
// In mongosh prompt
test> show dbs
# Should list your databases

test> db.collection.find().limit(1)
# Should query your collection
```

**Expected Output (Failure):**
```
MongoServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster
```

---

## ✅ METHOD 5: Check with API Route Test

Create a simple API route to test the connection:

**File:** `app/api/test/mongodb/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Testing MongoDB connection...');
    
    // Try to connect
    await connectDB();
    
    console.log('✅ MongoDB connected successfully');
    
    return NextResponse.json({
      status: 'success',
      message: 'Connected to MongoDB',
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
```

**Test it:**
```bash
# Run dev server
npm run dev

# In another terminal, test the endpoint
curl http://localhost:3001/api/test/mongodb

# Or visit in browser
# http://localhost:3001/api/test/mongodb
```

**Success Response:**
```json
{
  "status": "success",
  "message": "Connected to MongoDB",
  "timestamp": "2025-12-12T10:30:45.123Z"
}
```

**Failure Response:**
```json
{
  "status": "error",
  "message": "Could not connect to any servers in your MongoDB Atlas cluster",
  "timestamp": "2025-12-12T10:30:45.123Z"
}
```

---

## ✅ METHOD 6: Check Environment Variables

Verify your environment variables are set:

```bash
# Check if MONGODB_URI is set
echo $MONGODB_URI

# Should output something like:
# mongodb+srv://username:password@cluster.mongodb.net/dbname

# If nothing prints, variable is not set!
# Solution: Create or update .env.local
```

**Create .env.local if missing:**
```bash
cat > .env.local << EOF
MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/your_database
JWT_SECRET=your_secret_key
EOF
```

---

## ✅ METHOD 7: Use MongoDB Atlas Connection String Validator

**Check your connection string:**

1. Go to MongoDB Atlas > Clusters > Connect
2. Choose "Connect your application"
3. Copy the connection string
4. Make sure it has:
   - ✅ Format: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`
   - ✅ Valid username
   - ✅ Valid password (URL encoded if special chars)
   - ✅ Valid cluster name
   - ✅ Valid database name

**Common Issues:**
```
❌ mongodb+srv://user:pass@cluster
   → Missing database name at end

❌ mongodb+srv://user:p@ssw0rd@cluster...
   → Special character not URL encoded (should be %40 for @)

❌ mongodb+srv://user:pass@wrong-cluster...
   → Wrong cluster name

❌ mongodb://cluster...
   → Should use mongodb+srv (SRV record), not mongodb
```

---

## 📊 CHECKLIST: Is MongoDB Running?

Use this checklist to verify everything:

```
ENVIRONMENT SETUP
├─ [ ] .env.local file exists
├─ [ ] MONGODB_URI is set
├─ [ ] MONGODB_URI has valid format
└─ [ ] No syntax errors in URI

MONGODB ATLAS
├─ [ ] MongoDB Atlas cluster is running (not paused)
├─ [ ] Cluster shows green "Running" status
├─ [ ] Your IP is in Network Access whitelist
├─ [ ] Database exists in cluster
└─ [ ] Username and password are correct

APPLICATION
├─ [ ] npm run dev starts without errors
├─ [ ] Console shows "Connected to MongoDB"
├─ [ ] Can reach http://localhost:3001
└─ [ ] API routes compile without errors

CONNECTION TEST
├─ [ ] test-mongodb.js script succeeds
├─ [ ] mongosh connects successfully (if installed)
├─ [ ] API test endpoint returns 200
└─ [ ] Can query database with mongosh
```

---

## 🎯 QUICK DIAGNOSIS COMMAND

Run this to check your setup:

```bash
#!/bin/bash
echo "🔍 MongoDB Status Check"
echo "======================="
echo ""

# Check 1: Environment variable
echo "1️⃣  MONGODB_URI set?"
if [ -z "$MONGODB_URI" ]; then
  echo "   ❌ NO - Set it in .env.local"
else
  echo "   ✅ YES - $(echo $MONGODB_URI | cut -c1-40)..."
fi
echo ""

# Check 2: .env.local file
echo "2️⃣  .env.local exists?"
if [ -f ".env.local" ]; then
  echo "   ✅ YES"
else
  echo "   ❌ NO - Create it"
fi
echo ""

# Check 3: Run test script
echo "3️⃣  Testing connection..."
node test-mongodb.js
```

---

## 🚨 COMMON ERRORS & SOLUTIONS

| Error | Cause | Solution |
|-------|-------|----------|
| `MONGODB_URI is not set` | Environment variable missing | Create `.env.local` with `MONGODB_URI` |
| `Could not connect to any servers` | IP not whitelisted | Add your IP to MongoDB Atlas Network Access |
| `Authentication failed` | Wrong username/password | Check credentials in connection string |
| `Invalid connection string` | Wrong format | Use `mongodb+srv://user:pass@cluster/db` |
| `Cluster paused` | Cluster is not running | Go to MongoDB Atlas and resume cluster |
| `Connection timeout` | Network issue | Check your internet connection |
| `ENOTFOUND cluster.mongodb.net` | DNS issue | Try again, or check cluster name |

---

## 📝 TROUBLESHOOTING FLOW

```
Is MongoDB running?
  ↓
  ├─ Check .env.local exists? 
  │   └─ NO → Create it with MONGODB_URI
  │
  ├─ Check MONGODB_URI is set?
  │   └─ NO → Add to .env.local
  │
  ├─ Check connection string format?
  │   └─ WRONG → Fix format: mongodb+srv://user:pass@cluster/db
  │
  ├─ Check MongoDB Atlas cluster running?
  │   └─ NO → Resume cluster in dashboard
  │
  ├─ Check IP is whitelisted?
  │   └─ NO → Add IP in Network Access
  │
  ├─ Run test-mongodb.js
  │   └─ FAILS → Check error message for details
  │
  └─ Check npm run dev console
      └─ "Connected to MongoDB" → ✅ ALL GOOD!
```

---

## ✅ SUMMARY

**To check if MongoDB is running:**

1. **Quickest:** Look for "Connected to MongoDB" in `npm run dev` console
2. **Best:** Run `node test-mongodb.js` test script
3. **Web Dashboard:** Check MongoDB Atlas cluster status
4. **CLI Test:** Use `mongosh` if installed
5. **API Test:** Create test endpoint and call it

**All should show connection success.**

---

## 🔗 RELATED GUIDES

- `LOGIN_FIX_MONGODB_WHITELIST.md` - How to whitelist your IP
- `LOGIN_500_ERROR_FIX.md` - Troubleshoot login errors
- `LOGIN_ERROR_COMPLETE_GUIDE.md` - Complete login error diagnosis

---

**Status:** Ready to check MongoDB  
**Time:** 1-2 minutes  
**Difficulty:** Very Easy

Let me know which method you try and I can help interpret the results! 🚀
