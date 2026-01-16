# WhatsApp QR - Troubleshooting Guide

## Issue: QR Code Not Appearing ("Generating QR..." stuck)

### Root Cause
The EC2 bridge service is running but **Chromium browser is not installed** or **Puppeteer cache is corrupted**. The WhatsApp Web JavaScript library (whatsapp-web.js) requires Chromium to control the browser and generate QR codes.

### Quick Fix (Recommended)

Run this script from your Mac terminal:

```bash
bash scripts/fix-bridge-chromium.sh
```

This will:
1. ✅ SSH into EC2
2. ✅ Install system Chromium
3. ✅ Clear Puppeteer cache
4. ✅ Reinstall bridge dependencies with `PUPPETEER_SKIP_DOWNLOAD=true`
5. ✅ Restart bridge service
6. ✅ Trigger QR generation
7. ✅ Verify from your Mac

### Manual Fix (If Script Doesn't Work)

If SSH keys aren't configured, do this manually on EC2:

```bash
# SSH into EC2
ssh ubuntu@3.109.154.61

# Install Chromium
sudo apt-get update
sudo apt-get install -y chromium-browser

# Clear Puppeteer cache
rm -rf ~/.cache/puppeteer

# Go to bridge directory
cd /home/ubuntu/swaryoga-bridge

# Reinstall with system Chromium
PUPPETEER_SKIP_DOWNLOAD=true npm ci

# Restart bridge
pm2 restart wa-bridge
sleep 10

# Test
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://localhost:3333/qr
```

### After Fixes Applied

1. **Refresh browser**: `https://crm.swaryoga.com/admin/crm/qr`
2. **Press Cmd+Shift+R** (hard refresh on Mac)
3. **Click "Login" button again**
4. **QR code should now appear** ✅

### Testing Bridge Locally on EC2

```bash
ssh ubuntu@3.109.154.61

# Check bridge status
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://localhost:3333/status | jq .

# Check PM2 logs
pm2 logs wa-bridge --lines 30

# Manually trigger QR (if not auto-generating)
curl -X POST -H "X-Bridge-Secret: swar-bridge-secret-2024" http://localhost:3333/connect
sleep 5
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://localhost:3333/qr | jq .
```

### Expected Responses

**Before Fix:**
```json
{
  "status": "disconnected",
  "hasQr": false,
  "sessionReady": false,
  "qr": null,
  "chatCount": 0
}
```

**After Fix:**
```json
{
  "status": "qr",
  "hasQr": true,
  "sessionReady": false,
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "chatCount": 0
}
```

### Troubleshooting Tips

| Problem | Solution |
|---------|----------|
| "QR is not available yet" | Chromium not installed or not initialized |
| Bridge times out (504) | Check EC2 security group allows port 3333 |
| "Browser was not found" | Run `PUPPETEER_SKIP_DOWNLOAD=true npm ci` |
| "ENOSPC" errors | Disk full on EC2 - free up space with `sudo apt-get clean` |
| PM2 process crashed | Check logs with `pm2 logs wa-bridge --lines 50` |

### Prevention

To avoid this in the future:

1. **Keep Chromium installed**: Add to EC2 user data script
2. **Use environment variable**: Set `PUPPETEER_SKIP_DOWNLOAD=true` in `.env`
3. **Monitor disk space**: Alert when > 80% full
4. **Auto-restart bridge**: Already configured with PM2 startup hook

### Related Files

- Bridge code: `services/whatsapp-web/index.js`
- Bridge setup: `EC2_SETUP_SCRIPT.sh`, `EC2_AUTO_SETUP.md`
- Fix script: `scripts/fix-bridge-chromium.sh`
- QR component: `app/admin/crm/qr/page.tsx`
- API proxy: `app/api/admin/crm/whatsapp/qr-bridge/route.ts`
