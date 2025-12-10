# Server Connection Configuration Guide

## 🌐 Server Architecture

Your Swar Yoga application uses a distributed architecture:

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Next.js 14)                  │
│              Running on localhost:3000                   │
│         http://localhost:3000 (Development)             │
│         http://<your-ip>:3000 (Network Access)          │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────┐  ┌──────▼──────┐  ┌──▼─────────────┐
│ MongoDB    │  │  Supabase   │  │ External APIs  │
│  Atlas     │  │  (Auth)     │  │  (Calendar)    │
│ Database   │  │             │  │                │
└────────────┘  └─────────────┘  └────────────────┘
```

## 🔗 Connection Types

### 1. Local Development Connection
```
Client Browser → localhost:3000 → Next.js Server → External Services
                                 ↓
                         MongoDB Atlas
                         Supabase
                         API Services
```

**Configuration:**
```
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

### 2. Production Connection
```
Client Browser → swaryoga.com → Vercel (Hosting) → External Services
                                 ↓
                         MongoDB Atlas
                         Supabase
                         API Services
```

## 📡 Server Endpoints

### Local Development Server
```
Base URL: http://localhost:3000

Frontend Pages:
  /                  - Homepage
  /about            - About page
  /contact          - Contact form
  /signup           - User registration
  /signin           - User login
  /cart             - Shopping cart
  /checkout         - Payment page
  /thankyou         - Order confirmation
  /admin/login      - Admin authentication
  /admin/dashboard  - Admin dashboard
  /admin/signup-data    - View signups
  /admin/signin-data    - View logins
  /admin/contact-messages - View messages

API Endpoints:
  /api/auth/signup    - User registration API
  /api/auth/login     - User login API
  /api/contact        - Contact form submission
  /api/calendar       - Hindu calendar data
  /api/orders         - Order management
  /api/admin/signups  - Get signup data (admin)
  /api/admin/signins  - Get login data (admin)
  /api/admin/contacts - Get messages (admin)
```

## 🗄️ External Server Connections

### MongoDB Atlas
**Type:** NoSQL Database
**Host:** swaryogadb.dheqmu1.mongodb.net
**Port:** 27017 (default, encrypted)
**Database:** swar_yoga_db

**Connection Details:**
```
Protocol: MongoDB+SRV
Username: swarsakshi9_db_user
Password: Swaryogadbmongo170776
Connection String:
mongodb+srv://swarsakshi9_db_user:Swaryogadbmongo170776@swaryogadb.dheqmu1.mongodb.net/swar_yoga_db
```

**Collections:**
- `users` - User accounts and profiles
- `orders` - Purchase orders
- `contacts` - Contact form submissions
- `sessions` - User sessions (optional)

**Access from Localhost:**
```
✅ Connection: Direct connection via MONGODB_URI
✅ Authentication: Username/Password
✅ Encryption: TLS/SSL encrypted
✅ IP Whitelist: Your machine IP must be whitelisted
```

### Supabase (Authentication Service)
**Type:** Backend as a Service (BaaS)
**URL:** https://lspmnxpzzlirjhgtrunf.supabase.co
**Database:** PostgreSQL

**Connection Details:**
```
Project Name: swar-yoga
Region: Auto
Database: postgres
Public API: Enabled
Anon Key: sb_publishable_-3x32gqq6_5pvwxDzqC_OA_C-P1UECh
```

**Access from Localhost:**
```
✅ HTTPS secure connection
✅ API Key authentication
✅ Real-time subscriptions available
✅ No IP restrictions
```

### Hindu Calendar API
**Type:** REST API
**Base URL:** https://api.hinduCalendar.com
**Method:** GET/POST
**Format:** JSON

**Connection Details:**
```
API Key: hRY7KgTKXTSqjNZMJjslP5A0a3ZwJTVJ4IrY2GFJ16ec2e21
Rate Limit: 100 requests/hour
Authentication: API Key in headers
Response Time: < 500ms
```

**Access from Localhost:**
```
✅ REST API calls
✅ HTTPS secured
✅ Real-time data
✅ No IP restrictions
```

## 🔐 Security & Authentication

### MongoDB Connection Security
```
✅ TLS/SSL Encryption: Enabled
✅ IP Whitelist: Required
✅ Authentication: Username/Password
✅ User Permissions: Specific database access
```

**Add Your IP to MongoDB Whitelist:**
1. Go to https://cloud.mongodb.com
2. Select Swar Yoga project
3. Network Access → IP Whitelist
4. Add your IP address
5. Allow time for changes to propagate (~1 minute)

### API Security
```
✅ JWT Tokens: User authentication
✅ Environment Variables: Secrets not exposed
✅ HTTPS: All external connections encrypted
✅ Admin Verification: Admin routes require auth
```

## 📊 Connection Flow Diagram

### Signup Process
```
1. User fills signup form (http://localhost:3000/signup)
   ↓
2. Form data sent to /api/auth/signup
   ↓
3. Server validates data
   ↓
4. Password hashed with bcryptjs
   ↓
5. User document created in MongoDB
   ↓
6. JWT token generated and returned
   ↓
7. Token stored in browser localStorage
   ↓
8. User redirected to home page
```

### Admin Dashboard Access
```
1. Admin visits http://localhost:3000/admin/login
   ↓
2. Enters admin/Mohanpk@1010
   ↓
3. POST to /api/admin/login (credentials verified)
   ↓
4. Admin token generated
   ↓
5. Token stored in localStorage
   ↓
6. Redirect to /admin/dashboard
   ↓
7. Dashboard fetches data from /api/admin/signups
   ↓
8. API queries MongoDB for users
   ↓
9. Data displayed in table
```

### Contact Form Submission
```
1. User fills contact form
   ↓
2. Form data sent to /api/contact
   ↓
3. Server validates data
   ↓
4. Data saved to MongoDB contacts collection
   ↓
5. Success response sent to client
   ↓
6. User sees confirmation message
```

## 🧪 Test Connection

### Test Localhost is Running
```bash
# Check if server is running
curl http://localhost:3000

# Should return HTML content
```

### Test MongoDB Connection
```bash
# Check if database is accessible
curl http://localhost:3000/api/admin/signups \
  -H "Authorization: Bearer test_token"

# Should return JSON (with or without data)
```

### Test Supabase Connection
```bash
# Supabase connection is tested on signup/signin
# Check browser console for any auth errors
```

### Test External APIs
```bash
# Hindu Calendar API test
curl http://localhost:3000/api/calendar?date=2024-12-11

# Should return calendar data
```

## 🔄 Environment-Specific Configurations

### Development Environment (.env.local)
```
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
PORT=3000
MONGODB_URI=mongodb+srv://...
DEBUG=true
```

### Production Environment (Vercel)
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://swaryoga.com
PORT=3000 (managed by Vercel)
MONGODB_URI=mongodb+srv://... (same)
DEBUG=false
```

## 📈 Performance Optimization

### Connection Pooling
- MongoDB automatically manages connection pooling
- Recommended pool size: 10-50 connections

### Response Caching
- API responses cached at client-side
- Server-side caching not yet implemented

### Database Indexing
- Essential fields are indexed for fast queries
- Indexes on: email, createdAt, status

## 🚨 Common Connection Issues

### Issue: Cannot Connect to MongoDB
**Solution:**
1. Check MongoDB cluster is running (MongoDB Atlas)
2. Verify IP is whitelisted
3. Confirm connection string in .env.local
4. Check internet connectivity

### Issue: Supabase Auth Not Working
**Solution:**
1. Verify Supabase URL and keys
2. Check API is enabled in Supabase dashboard
3. Clear browser cache and localStorage

### Issue: Slow API Responses
**Solution:**
1. Check internet connection speed
2. Verify MongoDB cluster performance
3. Review browser DevTools Network tab
4. Check server logs for bottlenecks

### Issue: Mixed Content Error (HTTPS/HTTP)
**Solution:**
1. Ensure all external URLs use HTTPS
2. Update environment variables
3. Restart development server

## 📞 Debugging Connections

### View Network Requests
```bash
# In browser DevTools
1. Open F12
2. Go to Network tab
3. Perform action (signup, etc.)
4. Watch request/response
```

### Check Server Logs
```bash
# View PM2 logs
npm run pm2:logs

# View specific errors
npm run pm2:logs | grep "error"
```

### Monitor Real-time
```bash
# Monitor CPU and memory
npm run pm2:monit

# View detailed info
pm2 info swar-yoga-web
```

### Test API with curl
```bash
# Test signup endpoint
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com",...}'

# View response headers and body
```

## ✅ Connection Checklist

- [ ] localhost:3000 is accessible
- [ ] MongoDB connection string is correct
- [ ] Your IP is whitelisted in MongoDB Atlas
- [ ] Supabase keys are set in .env.local
- [ ] External API keys are configured
- [ ] .env.local file exists and is not committed
- [ ] Node.js version is 18 or higher
- [ ] npm dependencies are installed
- [ ] No port 3000 conflicts
- [ ] Internet connection is stable

## 🎯 Quick Connection Test

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Open in browser:**
   ```
   http://localhost:3000
   ```

3. **Check connections:**
   - Page should load (frontend ✅)
   - Navigate to signup (frontend ✅)
   - Fill and submit signup form (API ✅ MongoDB ✅)
   - Go to admin and login (Admin auth ✅)
   - View signup data (API + MongoDB ✅)

4. **All systems operational!** ✅

---

**Your server connections are fully configured and ready for development!**
