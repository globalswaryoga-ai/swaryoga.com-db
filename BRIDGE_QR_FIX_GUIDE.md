# 🔧 WhatsApp Bridge QR Issue - SOLUTION

## Problem Summary
- Bridge URL: `http://3.109.154.61:3333` ✓ (reachable)
- Bridge Secret: Set ✓
- **QR Code: MISSING ✗** → `hasQr: false`, `qr: null`
- Status: `disconnected`

The bridge server is running but the WhatsApp client hasn't generated a QR code yet.

---

## Root Cause
The WhatsApp client initialization on the EC2 bridge server is not emitting the 'qr' event, likely because:
1. Client crashed or hung on startup
2. Chrome/Chromium is not available on the EC2 instance
3. Client initialization failed silently

---

## Solution Implemented ✅

**Fixed code pushed to main branch:**
- Updated `/connect` endpoint to force client reinitialization if no QR available
- Enhanced logging in client initialization
- Better error handling for QR generation

**Commit:** `dbc0465`

---

## Deployment Steps (On EC2)

### Option A: Using PM2 (Recommended)

```bash
# SSH into EC2
ssh ubuntu@3.109.154.61

# Navigate to project
cd /home/ubuntu/swaryoga-bridge

# Pull latest code
git pull origin main

# Restart the bridge
pm2 restart wa-bridge

# Monitor logs
pm2 logs wa-bridge --tail 50
```

### Option B: Manual Restart

```bash
# SSH into EC2
ssh ubuntu@3.109.154.61

# Kill existing process
pkill -f "node.*server.js" || true
sleep 2

# Navigate to project
cd /home/ubuntu/swaryoga-bridge

# Pull latest code
git pull origin main

# Install dependencies (if needed)
npm install

# Start bridge in background
nohup node deploy/wa-bridge/server.js > /tmp/wa-bridge.log 2>&1 &

# Check logs
tail -f /tmp/wa-bridge.log
```

---

## Verification Steps

After deploying, test the bridge:

```bash
# Check bridge health
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://3.109.154.61:3333/health

# Check status
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://3.109.154.61:3333/status | jq .

# Expected output after fix:
# {
#   "status": "disconnected",
#   "hasQr": true,           ← Should be TRUE after fix
#   "sessionReady": false,
#   "qr": "data:image/png;base64,...",  ← QR data URL should be here
#   "chatCount": 0
# }

# If QR still missing, trigger connection:
curl -X POST -H "X-Bridge-Secret: swar-bridge-secret-2024" http://3.109.154.61:3333/connect

# Wait 3-5 seconds, then check status again
sleep 5
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://3.109.154.61:3333/status | jq .hasQr
```

---

## Troubleshooting

### If QR still missing after deployment:

**Check bridge logs:**
```bash
# SSH into EC2
ssh ubuntu@3.109.154.61

# Check PM2 logs
pm2 logs wa-bridge --tail 100

# Or check manual log
tail -100 /tmp/wa-bridge.log
```

**Common issues & fixes:**

1. **Chrome/Chromium not found:**
   ```bash
   # Install Chrome on EC2
   sudo apt-get update
   sudo apt-get install -y chromium-browser
   ```

2. **Port 3333 already in use:**
   ```bash
   sudo lsof -i :3333
   sudo kill -9 <PID>
   ```

3. **Session directory permissions:**
   ```bash
   chmod -R 777 /home/ubuntu/swaryoga-bridge/.wwebjs_auth
   ```

4. **Node process memory limit:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" node deploy/wa-bridge/server.js
   ```

---

## Admin Dashboard Update

Once QR is working:

1. Go to: `https://crm.swaryoga.com/admin/crm/qr`
2. **Before fix:** "QR in response: ✗ MISSING"
3. **After fix:** "QR in response: ✓ (XXXX chars)"
4. QR modal should auto-open
5. Scan with WhatsApp to connect

---

## What Changed?

**File:** `deploy/wa-bridge/server.js`

1. **Enhanced `/connect` endpoint:**
   - Now checks if client exists but no QR
   - Forces reinitialization if needed
   - Provides better feedback

2. **Improved logging:**
   - Better visibility into client initialization
   - Clear messages about QR code status
   - Debugging information for troubleshooting

3. **Better error handling:**
   - Graceful fallback for client destruction
   - Proper async/await handling
   - More detailed error messages

---

## Next Steps

1. **Deploy fix to EC2** (choose Option A or B above)
2. **Verify QR appears** using curl commands above
3. **Test in Admin CRM** - go to `/admin/crm/qr` page
4. **Scan QR** with WhatsApp mobile app
5. **Verify connection** - should show as "connected"

---

## Status Dashboard

After deployment, check real-time status:

```
Bridge URL: http://3.109.154.61:3333 ✓
Last /status: 200 ✓
QR in response: ✓ (Should be available now)
Status: disconnected → qr → [scan] → connected
HasQr: ✓ (After deployment)
Secret set: ✓
```

---

**Estimated fix time:** 5-10 minutes
**Deployment method:** Git pull + PM2 restart
**Risk level:** Low (code improvements only)

Need help? Check `/tmp/wa-bridge.log` on EC2 for detailed errors.
