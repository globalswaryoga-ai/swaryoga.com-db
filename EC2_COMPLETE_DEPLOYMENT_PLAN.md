# EC2 Bridge Deployment - Complete Plan

## Status
- ✅ EC2 connected (ubuntu user)
- ✅ `/home/ubuntu/wa-bridge/` directory exists
- ❌ Directory is empty
- ❌ Disk is 100% full (only 372KB free)

---

## IMMEDIATE ACTIONS

### On EC2 Terminal - Free Disk Space:
```bash
# Run these commands to free ~2-3GB
sudo rm -rf /tmp/* /var/tmp/*
sudo find /var/log -type f -delete 2>/dev/null
sudo swapoff -a 2>/dev/null && sudo rm -f /swapfile
sudo rm -rf /var/lib/docker/* 2>/dev/null

# Check freed space
df -h /
```

**Expected result:** Should have at least 1-2GB free after this.

---

### On Mac Terminal - Upload Bridge Files:

Once you have ~500MB+ free on EC2, run this on Mac:

```bash
# Go to your codebase
cd /Users/mohankalburgi/swaryoga.com-db

# Copy all bridge files to EC2
scp -i ~/Downloads/wa-bridge-key-2.pem -r deploy/wa-bridge/* ubuntu@3.80.11.153:/home/ubuntu/wa-bridge/

# Verify upload was successful
ssh -i ~/Downloads/wa-bridge-key-2.pem ubuntu@3.80.11.153 "ls -la /home/ubuntu/wa-bridge/ | head -20"
```

Should see files like:
- server.js
- package.json
- .env
- etc.

---

### On EC2 Terminal - Install & Run Bridge:

```bash
cd /home/ubuntu/wa-bridge

# Install dependencies
npm install

# Create .env file if it doesn't exist
cat > .env << 'ENVFILE'
PORT=3333
WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024
WHATSAPP_WEB_ALLOWED_ORIGINS=https://crm.swaryoga.com,https://swaryoga.com,https://www.swaryoga.com
NEXT_BASE_URL=https://crm.swaryoga.com
WHATSAPP_CLIENT_ID=crm-whatsapp-session
CHROME_PATH=/usr/bin/google-chrome
ENVFILE

# Start the bridge
node server.js
```

Should see output like:
```
✓ Using Chrome at: /usr/bin/google-chrome
Bridge server running on port 3333
QR Code ready at http://localhost:3333/qr
```

---

### Verify from Mac - Test Bridge:

```bash
# Test the endpoint
curl -H "x-bridge-secret: swar-bridge-secret-2024" https://wa-bridge.swaryoga.com/status | jq .

# Should return QR code status JSON
```

---

## Troubleshooting

### If npm install still fails (no space):
```bash
# Try installing one package at a time
npm install --no-save express cors dotenv qrcode whatsapp-web.js
```

### If Chrome not found:
```bash
# Check if it exists
which google-chrome || which chromium-browser

# If not installed:
sudo apt-get update && sudo apt-get install -y chromium-browser
```

### If port 3333 in use:
```bash
sudo lsof -i :3333
sudo kill -9 <PID>
```

### Keep bridge running in background:
```bash
nohup node server.js > bridge.log 2>&1 &
# Then exit SSH, bridge keeps running
# To check: ssh and run: tail -f bridge.log
```

---

## Next Steps Summary

1. **On EC2:** Delete temp files to free disk space
2. **On Mac:** Upload bridge files via SCP
3. **On EC2:** Run `npm install`
4. **On EC2:** Run `node server.js`
5. **On Mac:** Test the endpoint with curl
6. **On Vercel:** All 27 environment variables should be configured
7. **Test:** Try QR code on crm.swaryoga.com

---

## Files Being Uploaded

```
deploy/wa-bridge/
├── server.js              (323 lines - main bridge app)
├── package.json          (5 npm dependencies)
├── .env.example          (env template)
├── docker-compose.yml    (Docker setup - optional)
├── nginx-wa-bridge.conf  (Nginx config - for reference)
├── start.sh             (Start script)
├── deploy.sh            (Deployment script)
├── verify.sh            (Verification script)
└── README.md            (Documentation)
```

Total size: ~50KB (very small, should fit easily)

---

## Success Criteria

✅ Bridge files on EC2
✅ npm install succeeds
✅ node server.js runs without errors
✅ curl to https://wa-bridge.swaryoga.com/status returns JSON
✅ QR code appears on crm.swaryoga.com admin panel
✅ WhatsApp Web session scans QR successfully
