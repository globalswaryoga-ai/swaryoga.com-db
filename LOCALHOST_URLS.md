# Swar Yoga - Localhost URL Quick Reference

## 🌐 Main Application
**Base URL:** `http://localhost:3000`

---

## 📍 All Localhost Routes

### 🏠 Main Pages
| Page | URL |
|------|-----|
| **Home** | http://localhost:3000/ |
| **About** | http://localhost:3000/about |
| **Contact** | http://localhost:3000/contact |
| **Cart** | http://localhost:3000/cart |
| **Checkout** | http://localhost:3000/checkout |
| **Thank You** | http://localhost:3000/thankyou |

### 👤 User Authentication
| Page | URL |
|------|-----|
| **Sign Up** | http://localhost:3000/signup |
| **Sign In** | http://localhost:3000/signin |

### 🔐 Admin Panel
| Page | URL |
|------|-----|
| **Admin Login** | http://localhost:3000/admin/login |
| **Admin Dashboard** | http://localhost:3000/admin/dashboard |
| **View Signups** | http://localhost:3000/admin/signup-data |
| **View Sign-ins** | http://localhost:3000/admin/signin-data |
| **View Messages** | http://localhost:3000/admin/contact-messages |

### 🔌 API Endpoints
| Endpoint | URL | Method |
|----------|-----|--------|
| **User Signup** | http://localhost:3000/api/auth/signup | POST |
| **User Login** | http://localhost:3000/api/auth/login | POST |
| **Contact Form** | http://localhost:3000/api/contact | POST |
| **Calendar** | http://localhost:3000/api/calendar | GET |
| **Orders** | http://localhost:3000/api/orders | GET/POST |
| **Admin Signups** | http://localhost:3000/api/admin/signups | GET |
| **Admin Sign-ins** | http://localhost:3000/api/admin/signins | GET |
| **Admin Messages** | http://localhost:3000/api/admin/contacts | GET |

---

## 🚀 How to Start Localhost Server

### Option 1: Development Mode (Hot Reload)
```bash
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan
npm run dev
```
**Access:** http://localhost:3000

### Option 2: Production Mode
```bash
npm run build
npm start
```
**Access:** http://localhost:3000

### Option 3: PM2 Management
```bash
npm run pm2:start
```
**Check Status:**
```bash
npm run pm2:status
```
**View Logs:**
```bash
npm run pm2:logs
```

---

## ✅ Verify Localhost is Running

### In Terminal
```bash
# Check if server responds
curl http://localhost:3000

# Should return HTML of home page
```

### In Browser
Open: **http://localhost:3000**

You should see the Swar Yoga homepage with:
- ✅ Green header/navigation
- ✅ Hero section with gradient
- ✅ Welcome message
- ✅ Shop and Learn buttons

---

## 📱 Key Localhost Features

### Homepage
```
URL: http://localhost:3000
Features:
- Hero section with green gradient
- Navigation bar with green theme
- Shop button → http://localhost:3000/cart
- Learn button → http://localhost:3000/about
```

### Signup Page
```
URL: http://localhost:3000/signup
Features:
- Comprehensive signup form
- 195 countries with state dropdowns
- Gender, age, profession fields
- Password validation
- Submit creates user in MongoDB
```

### Admin Panel
```
URL: http://localhost:3000/admin/login
Credentials:
- Username: admin
- Password: Mohanpk@1010

Dashboard: http://localhost:3000/admin/dashboard
- View all signups
- View login data
- View contact messages
- Export to CSV
```

### Contact Form
```
URL: http://localhost:3000/contact
Features:
- Auto-fill for logged-in users
- 7 subject categories
- Country code selector
- WhatsApp field
- Message textarea
```

---

## 🔗 Test Your Connection

### Quick Test URLs
Click these links to test different parts of the application:

1. **Homepage:** http://localhost:3000
2. **Sign Up:** http://localhost:3000/signup
3. **Sign In:** http://localhost:3000/signin
4. **Contact:** http://localhost:3000/contact
5. **Admin Login:** http://localhost:3000/admin/login
6. **API Test:** http://localhost:3000/api/admin/signups

---

## 🎯 Common Localhost Tasks

### Task 1: Test User Signup
1. Go to: http://localhost:3000/signup
2. Fill the form with test data
3. Click "Create Account"
4. Verify success message

### Task 2: Check Admin Panel
1. Go to: http://localhost:3000/admin/login
2. Enter: `admin` / `Mohanpk@1010`
3. View: http://localhost:3000/admin/signup-data
4. See your newly created user

### Task 3: Test Contact Form
1. Go to: http://localhost:3000/contact
2. Fill and submit the form
3. Check MongoDB for the submission

### Task 4: Monitor Server
```bash
npm run pm2:status      # See server status
npm run pm2:logs        # View server logs
npm run pm2:monit       # Monitor CPU/Memory
```

---

## 🌍 Network Access

### Local Computer Only
```
http://localhost:3000
```

### From Other Computers on Network
```
http://<your-ip>:3000

Example:
http://192.168.1.100:3000
```

**Find Your IP:**
```bash
ifconfig | grep "inet "
```

---

## ⚡ Quick Command Reference

```bash
# Start server
npm run dev                    # Development mode
npm run pm2:start            # Start with PM2
npm run pm2:restart          # Restart PM2

# Monitor
npm run pm2:status           # Check status
npm run pm2:logs             # View logs
npm run pm2:monit            # Real-time monitoring

# Build
npm run build                # Production build
npm start                    # Run production

# Stop
npm run pm2:stop             # Stop PM2
npm run pm2:delete           # Delete from PM2
```

---

## 📊 Server Status

### Current Status
```
✅ Application: Running on localhost:3000
✅ MongoDB: Connected
✅ PM2: Active (auto-restart every 5 minutes)
✅ Auto-restart: Enabled
```

### Check Status Command
```bash
npm run pm2:status
```

Expected output:
```
│ swar-yoga-web │ cluster │ online │ cron: */5 * * * * │
```

---

## 🔐 Admin Credentials for Testing

```
Admin Panel URL: http://localhost:3000/admin/login

Username: admin
Password: Mohanpk@1010
```

---

## 📝 Environment Setup

Your application uses this configuration:

```
API Base URL: http://localhost:3000
MongoDB: Connected via MONGODB_URI
Supabase: Configured for authentication
Node Environment: Development or Production (depending on npm run command)
```

Verify in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development (for npm run dev)
```

---

## ✨ Features Available on Localhost

✅ **User Management**
- Signup with comprehensive form
- Signin with email/password
- Auto-fill for logged-in users

✅ **Admin Panel**
- View all signups
- View signin logs
- View contact messages
- CSV export

✅ **Forms**
- Contact form with auto-fill
- Shopping cart
- Checkout process

✅ **Database**
- All data saved to MongoDB
- Real-time updates
- Persistent storage

✅ **API**
- Full RESTful API
- JWT authentication
- Admin endpoints

---

## 🆘 Troubleshooting

### Can't Access localhost:3000?
1. Check if server is running: `npm run pm2:status`
2. Start server: `npm run dev`
3. Wait 5-10 seconds for startup
4. Refresh browser

### Port 3000 Already in Use?
```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### MongoDB Connection Error?
1. Check `.env.local` has MONGODB_URI
2. Verify IP is whitelisted in MongoDB Atlas
3. Check internet connection
4. Restart server

---

## 📞 Support URLs

**GitHub Repository:**
https://github.com/globalswaryoga-ai/swaryoga.com-db.git

**Documentation Files:**
- LOCALHOST_SETUP.md
- SERVER_CONNECTION_GUIDE.md
- COLOR_SCHEME.md
- PM2_AUTO_RESTART_5MIN.md

---

## 🎯 Summary

| What | Where |
|------|-------|
| **Main App** | http://localhost:3000 |
| **Admin Panel** | http://localhost:3000/admin/login |
| **Signup** | http://localhost:3000/signup |
| **Contact** | http://localhost:3000/contact |
| **API Base** | http://localhost:3000/api/* |

**Start Server:**
```bash
npm run dev
```

**Your app is ready at:** 🌐 **http://localhost:3000**
