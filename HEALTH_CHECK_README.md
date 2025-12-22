# Development Health Check

Automatically checks if your development environment is properly configured when you run `npm run dev`.

## Features

The health check verifies:
- ✅ **Localhost**: Dev server is running on http://localhost:3000
- ✅ **MongoDB**: Database connection is working
- ✅ **API**: Health check endpoint is responding

## Usage

### Run with Health Check (Default)
```bash
npm run dev
```

This starts the Next.js dev server AND runs a health check after 3 seconds.

### Run Without Health Check
```bash
npm run dev:no-check
```

Use this if health checks are interfering with your development.

### Run Health Check Manually
```bash
npm run health-check
```

Check status at any time without restarting the dev server.

## What It Checks

### 1. Localhost
```
✅ Running on http://localhost:3000
⏳ Dev server not ready yet (still starting)
❌ Server connection error
```

### 2. MongoDB
```
✅ Connected successfully
❌ Cannot resolve MongoDB host (check MONGODB_URI)
❌ Authentication failed (check credentials)
⚠️  MONGODB_URI not set in .env
```

### 3. API Endpoints
```
✅ Health endpoint responding
⏳ API not ready yet (dev server still starting)
⚠️  Status 404 (normal during startup)
```

## Sample Output

```
╔════════════════════════════════════════════════════════════╗
║          🏥 DEVELOPMENT ENVIRONMENT HEALTH CHECK          ║
╚════════════════════════════════════════════════════════════╝

📊 Checking services...

📋 Status Report:

  Localhost:     ✅ Running on http://localhost:3000
  MongoDB:       ✅ Connected successfully
  API Endpoints: ✅ Health endpoint responding

✨ All systems ready for development!

═══════════════════════════════════════════════════════════

📝 Environment:

   Node Version:    v18.17.0
   MongoDB URI:     ✅ Set
   JWT Secret:      ✅ Set
```

## Troubleshooting

### MongoDB Connection Failed

**Error:** `❌ Cannot resolve MongoDB host`

**Solution:**
1. Check `.env` file has `MONGODB_URI`
2. Verify MongoDB cluster is running
3. Check IP whitelist in MongoDB Atlas

### Dev Server Not Ready

**Message:** `⏳ Dev server not ready yet (still starting)`

**Solution:**
- This is normal during startup
- Run `npm run health-check` again in 5-10 seconds
- Or use `npm run dev:no-check` to skip checks

### Missing Environment Variables

**Message:** `⚠️  MONGODB_URI not set in .env`

**Solution:**
1. Create `.env.local` file
2. Add required variables:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-secret-key
   ```
3. Restart dev server

## Health Check Endpoint

The health check also exposes an API endpoint you can query:

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-22T12:00:00.000Z",
  "environment": {
    "nodeVersion": "v18.17.0",
    "hasMongoDBUri": true,
    "hasJwtSecret": true
  },
  "checks": {
    "localhost": true,
    "mongodb": true,
    "api": true
  }
}
```

## Files Modified

- `scripts/health-check.js` - Health check script
- `app/api/health/route.ts` - Health check endpoint
- `package.json` - Added dev scripts

## Tips

- Run `npm run health-check` before submitting changes
- Use `npm run dev:no-check` if health checks slow down startup
- Monitor `npm run pm2:logs` for production health

---

**Last Updated:** Dec 22, 2025
