# Local Development Setup - Swar Yoga

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ installed
- npm or yarn
- MongoDB Atlas account (credentials ready)
- Supabase account (optional)

### Step 1: Environment Setup

Create `.env.local` file in the project root:

```bash
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://swarsakshi9_db_user:Swaryogadbmongo170776@swaryogadb.dheqmu1.mongodb.net/swar_yoga_db

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://lspmnxpzzlirjhgtrunf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_-3x32gqq6_5pvwxDzqC_OA_C-P1UECh
SUPABASE_SERVICE_ROLE_KEY=sb_secret_om4KkEZ16Rg2sg4U0Xjxag_EnGnlK2D

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# JWT Secret
JWT_SECRET=swar_yoga_jwt_secret_key_minimum_32_characters_long_2024

# Hindu Calendar API
HINDU_CALENDAR_API_KEY=hRY7KgTKXTSqjNZMJjslP5A0a3ZwJTVJ4IrY2GFJ16ec2e21
HINDU_CALENDAR_API_URL=https://api.hinduCalendar.com

# Node Environment
NODE_ENV=development
```

### Step 2: Install Dependencies

```bash
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan
npm install
```

### Step 3: Run Development Server

#### Option A: Standard Development Server
```bash
npm run dev
```

The application will be available at:
- **Local:** http://localhost:3000
- **Network:** http://<your-ip>:3000

#### Option B: Production Build & Run Locally
```bash
npm run build
npm start
```

#### Option C: Run with PM2 (Recommended for Testing)
```bash
npm run pm2:start
```

Check status:
```bash
npm run pm2:status
```

## 📍 Localhost Addresses

### Main Application
- **Development:** http://localhost:3000
- **Production Build:** http://localhost:3000

### Key Routes
```
Home:           http://localhost:3000/
About:          http://localhost:3000/about
Contact:        http://localhost:3000/contact
Signup:         http://localhost:3000/signup
Signin:         http://localhost:3000/signin
Cart:           http://localhost:3000/cart
Checkout:       http://localhost:3000/checkout
Thank You:      http://localhost:3000/thankyou

Admin:          http://localhost:3000/admin/login
Admin Dash:     http://localhost:3000/admin/dashboard
Signups:        http://localhost:3000/admin/signup-data
Signins:        http://localhost:3000/admin/signin-data
Messages:       http://localhost:3000/admin/contact-messages
```

### API Endpoints
```
Signup:         http://localhost:3000/api/auth/signup
Signin:         http://localhost:3000/api/auth/login
Contact:        http://localhost:3000/api/contact
Calendar:       http://localhost:3000/api/calendar

Admin APIs:
Signups:        http://localhost:3000/api/admin/signups
Signins:        http://localhost:3000/api/admin/signins
Messages:       http://localhost:3000/api/admin/contacts
```

## 🔌 Server Connections

### MongoDB Connection
The application automatically connects to MongoDB Atlas using the `MONGODB_URI` environment variable.

**Connection String:**
```
mongodb+srv://swarsakshi9_db_user:Swaryogadbmongo170776@swaryogadb.dheqmu1.mongodb.net/swar_yoga_db
```

**Verify Connection:**
1. Go to http://localhost:3000/api/admin/signups
2. If connected, you should see signup data (if any exists)
3. Check browser console for any connection errors

### Supabase Connection (Optional)
Used for authentication service (currently not actively used, but configured).

**Supabase URL:** https://lspmnxpzzlirjhgtrunf.supabase.co

### API Configuration
```
API Base URL: http://localhost:3000
All requests are relative to this URL
```

## 🧪 Testing Localhost

### Test Signup Flow
1. Open http://localhost:3000/signup
2. Fill out the form:
   - Name: Test User
   - Email: test@example.com
   - Phone: 9876543210
   - Country: India
   - State: Maharashtra
   - Gender: Male
   - Age: 30
   - Profession: Tester
   - Password: TestPass123
3. Click "Create Account"
4. Check http://localhost:3000/admin/dashboard
5. Login with admin/Mohanpk@1010
6. View "Signup Data" to see your new user

### Test Admin Panel
1. Go to http://localhost:3000/admin/login
2. Username: `admin`
3. Password: `Mohanpk@1010`
4. Explore dashboard and data views

### Test Contact Form
1. Go to http://localhost:3000/contact
2. Fill and submit the form
3. Check server logs for submission confirmation

### Test API Endpoints
Using curl or Postman:

**Signup API:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "countryCode": "+91",
    "country": "India",
    "state": "Maharashtra",
    "gender": "male",
    "age": 30,
    "profession": "Tester",
    "password": "TestPass123"
  }'
```

**Fetch Signups:**
```bash
curl -X GET http://localhost:3000/api/admin/signups \
  -H "Authorization: Bearer your_admin_token"
```

## 📊 Database Connection Check

### Verify MongoDB is Connected

1. **Check Application Startup:**
   ```bash
   npm run dev
   ```
   Look for successful connection logs

2. **Make an API Call:**
   ```bash
   curl http://localhost:3000/api/admin/signups
   ```

3. **View Logs:**
   ```bash
   npm run pm2:logs
   ```
   Look for connection confirmation

4. **Via MongoDB Atlas Dashboard:**
   - Go to https://cloud.mongodb.com
   - Select "Swar Yoga" cluster
   - Check "Network Access" for your IP
   - View "Metrics" for connection status

### Troubleshooting Connection Issues

**Error: "Please define the MONGODB_URI environment variable"**
- Ensure `.env.local` file exists in project root
- Verify `MONGODB_URI` is correctly set
- Restart development server

**Error: "Connection refused"**
- Check MongoDB Atlas cluster is running
- Verify your IP is whitelisted in MongoDB Atlas
- Check internet connection

**Error: "Authentication failed"**
- Verify username and password in connection string
- Check MongoDB user has correct permissions
- Reset password if needed

## 🌐 Network Access

### Access from Other Machines
To access from another computer on your network:

1. **Find Your IP Address:**
   ```bash
   ifconfig | grep "inet "
   ```

2. **Access Application:**
   ```
   http://<your-ip>:3000
   ```

3. **Firewall Settings:**
   - Allow port 3000 through firewall
   - For Mac: System Preferences → Security & Privacy → Firewall

## 📦 Project Scripts

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Production
npm run build            # Build for production
npm start                # Start production server

# PM2 Management
npm run pm2:start        # Start with PM2
npm run pm2:stop         # Stop PM2 process
npm run pm2:restart      # Restart PM2 process
npm run pm2:logs         # View PM2 logs
npm run pm2:status       # Check PM2 status
npm run pm2:monit        # Monitor with PM2

# Utilities
npm run lint             # Run linter
npm run type-check       # Check TypeScript
```

## 🔍 Checking Connections

### Check Dev Server is Running
```bash
# In terminal
npm run dev

# In browser
http://localhost:3000
```

### Check MongoDB Connection
```bash
# View startup logs
npm run dev 2>&1 | grep -i "mongo\|database\|connect"
```

### Check API Endpoints
```bash
curl http://localhost:3000/api/admin/signups
```

### Check PM2 Status
```bash
npm run pm2:status
```

## 📱 Development Tools

### Browser DevTools
1. Open http://localhost:3000
2. Press F12 (or Cmd+Option+I on Mac)
3. Check Console for errors
4. Use Network tab to monitor API calls
5. Check Local Storage for tokens

### VS Code Extensions Recommended
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Thunder Client (API testing)
- MongoDB for VS Code

### Testing Tools
- **Postman:** API testing
- **Thunder Client:** VS Code extension for API calls
- **curl:** Command line API testing
- **Browser DevTools:** Network monitoring

## 🚨 Common Issues & Solutions

### Port 3000 Already in Use
```bash
# Kill process on port 3000 (Mac/Linux)
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### MongoDB Connection Timeout
- Check internet connection
- Verify IP is whitelisted in MongoDB Atlas
- Check MongoDB cluster is not paused
- Try restarting development server

### Hot Reload Not Working
- Make sure file is in `app/` directory
- Check for TypeScript errors
- Restart development server

### Styling Not Applying
- Clear `.next` folder: `rm -rf .next`
- Rebuild: `npm run build`
- Restart dev server

## 📝 Environment Variables Checklist

- [ ] `.env.local` file created
- [ ] `MONGODB_URI` set correctly
- [ ] `NEXT_PUBLIC_API_URL` set to `http://localhost:3000`
- [ ] `JWT_SECRET` set
- [ ] Supabase keys set (if needed)
- [ ] Calendar API key set

## 🎯 Next Steps

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local`:**
   ```bash
   cp .env.example .env.local
   # Edit with your values
   ```

3. **Start Development:**
   ```bash
   npm run dev
   ```

4. **Open Browser:**
   ```
   http://localhost:3000
   ```

5. **Test Features:**
   - Signup at http://localhost:3000/signup
   - Admin login at http://localhost:3000/admin/login
   - Contact form at http://localhost:3000/contact

6. **Check Logs:**
   ```bash
   npm run pm2:logs
   ```

## 📞 Support

If you encounter issues:

1. Check `.env.local` has all required variables
2. Verify MongoDB connection string
3. Clear `.next` and `node_modules` if needed
4. Check browser console for errors (F12)
5. Review server logs: `npm run pm2:logs`

---

**Your localhost development server is ready!**
**Access it at: http://localhost:3000**
