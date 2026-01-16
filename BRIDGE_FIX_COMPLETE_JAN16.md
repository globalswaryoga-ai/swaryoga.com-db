# WhatsApp Bridge Fix Summary - January 16, 2026

## Problem
WhatsApp bridge on EC2 had critical failures:
1. Messages incoming and outgoing stopped working
2. Image upload/download functionality broken
3. QR code not generating for new connections
4. Bridge client disconnected and failing to reconnect

## Root Cause
Multiple interconnected issues:

### Issue 1: Missing System Dependencies
- Chromium browser failed to launch due to missing D-Bus and document portal services
- Error: `xdg-settings: not found` and `cannot start document portal`
- Affected environment: EC2 Ubuntu 22.04 (headless, no X11)

### Issue 2: NPM Dependencies Not Installed
- Bridge directory (`/home/ubuntu/bridge/deploy/wa-bridge`) had no `node_modules`
- `multer` module was missing (required for file uploads)
- Error: `Cannot find module 'multer'`
- PM2 continuously restarted the process (32+ restarts)

### Issue 3: Chrome vs Chromium Selection
- Chromium on headless EC2 had issues with D-Bus and system requirements
- Google Chrome (stable) is more reliable for headless servers

## Solution Implemented

### Step 1: Install System Dependencies
```bash
sudo apt-get install -y \
  libasound2 \
  libatk1.0-0 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libfontconfig1 \
  libgbm1 \
  ... (27 total packages)
```

Also installed: `xdg-utils` for headless environment support

### Step 2: Install NPM Dependencies on EC2
```bash
cd /home/ubuntu/bridge/deploy/wa-bridge
npm install
```

This installed:
- `express` - web server
- `whatsapp-web.js` - WhatsApp client library
- `qrcode` - QR code generation
- `multer` - file upload handling
- `cors` - cross-origin requests
- Plus 10 other dependencies

### Step 3: Code Changes
Updated `/deploy/wa-bridge/server.js`:

1. **Added Chromium headless launch arguments**
   - `--disable-sync`
   - `--disable-extensions`
   - `--disable-speech-api`
   - `--use-fake-ui-for-media-stream`
   - `--use-fake-device-for-media-stream`
   - Plus 8 more

2. **Increased protocol timeout** to 180 seconds (was causing timeouts)

3. **Prioritized Google Chrome over Chromium**
   - Changed path detection to try `/usr/bin/google-chrome` first
   - Then `/usr/bin/google-chrome-stable`
   - Fallback to Chromium if needed

### Step 4: Install Google Chrome on EC2
```bash
sudo apt-get install -y google-chrome-stable
```

Version installed: 144.0.7559.59

## Results

### Before Fix
```json
{
  "status": "disconnected",
  "hasQr": false,
  "sessionReady": false,
  "qr": null,
  "chatCount": 0
}
```

### After Fix
```json
{
  "status": "qr",
  "hasQr": true,
  "sessionReady": false,
  "qr": "data:image/png;base64,[...large QR code PNG...]",
  "chatCount": 0
}
```

## Commits Made

1. **dbc0465** - Initial QR code fix (improved client reinitialization)
2. **0cc734b** - Add comprehensive Chromium headless args
3. **b6930a0** - Remove invalid env parameter from puppeteer config
4. **fad5340** - Prioritize Google Chrome over Chromium for EC2

## Current Status

✅ **Bridge Server Running**: Online (PM2 process 7202)
✅ **HTTP Endpoint**: Reachable at http://3.109.154.61:3333
✅ **QR Code**: Generated and available for scanning
⏳ **WhatsApp Client**: Initializing (waiting for user to scan QR)

## Next Steps

### For End Users
1. Go to: https://crm.swaryoga.com/admin/crm/qr
2. Click "Connect" button
3. Wait for QR code to appear (should see it now)
4. Scan with WhatsApp on phone
5. WhatsApp client will connect and start receiving messages

### For Messages to Flow
1. User must connect via QR code
2. Bridge will download existing chat history
3. Incoming messages will trigger webhooks to API
4. MongoDB collections will populate with data

### For File Operations
1. Image uploads will go through `/media/upload` endpoint
2. S3 credentials needed in environment variables
3. Images will be served via S3 URLs

## Testing Commands

### Check Bridge Status
```bash
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://3.109.154.61:3333/status
```

### Check Chats (after connection)
```bash
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://3.109.154.61:3333/chats
```

### Send Test Message
```bash
curl -X POST \
  -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  -H "Content-Type: application/json" \
  -d '{"chatId":"919XXXXXXXXX@c.us","message":"Test"}' \
  http://3.109.154.61:3333/send
```

## Lessons Learned

1. **Headless Linux Environment Challenges**
   - Chrome/Chromium need extra dependencies on server
   - D-Bus and document portal issues are common
   - Google Chrome is more stable than Chromium on servers

2. **NPM Dependency Management**
   - Always run `npm install` in deployment directories
   - Don't rely on global npm installations

3. **Monitoring**
   - Watch PM2 logs: `pm2 logs whatsapp-bridge --tail`
   - Check process restarts: `pm2 info whatsapp-bridge`
   - Monitor EC2 disk space (currently 80%+ used)

4. **Error Handling**
   - Bridge code gracefully handles browser crashes
   - PM2 auto-restarts failed processes
   - Detailed error messages in logs help diagnosis

## Files Modified

- `deploy/wa-bridge/server.js` - 4 commits with improvements
- `.env` - Verified bridge secret and credentials
- No database schema changes needed

## Disk Space Alert

EC2 currently at 82.6% disk usage. Recommend:
- Clean up old Docker images
- Remove build artifacts
- Archive old logs

Monitor with: `df -h`

---

**Fix Completed**: January 16, 2026 23:25 UTC
**Status**: QR Bridge Online, Awaiting User Connection
**Next Review**: Monitor for 24 hours to ensure stability
