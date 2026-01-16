# 🎯 IMMEDIATE ACTION ITEMS - QR CODE FIX

## Current Status
✅ **Bridge is running** on `3.109.154.61:3333`  
✅ **All other systems working** (Next.js, API, database)  
❌ **QR code NOT generating** due to missing Chromium  

**Time to Resolution**: 10-15 minutes with automated script

---

## 🚀 QUICK START (Copy-Paste Ready)

### Step 1: Run the Automated Setup
```bash
cd /path/to/swaryoga.com-db
bash setup-permanent-solution.sh
```

**What this does**:
- Installs Chromium on EC2 ✅
- Updates all dependencies ✅
- Restarts the bridge ✅
- Enables auto-healing ✅
- Deploys to Vercel ✅

**Time**: 10-15 minutes

---

### Step 2: Verify Installation (After ~3 minutes)
```bash
node scripts/qr-complete-diagnostic.js
```

**Expected output**:
```
✅ Bridge responding on 3.109.154.61:3333
✅ QR Code Generation: SUCCESS
✅ QR code is available!
```

---

### Step 3: Access QR in Browser
Go to: https://crm.swaryoga.com/admin/crm/qr

You should see:
- QR code displayed
- "Scan with WhatsApp" message

---

### Step 4: Test with WhatsApp
- Scan QR with WhatsApp mobile app
- Should connect and show message thread
- Send a test message

---

## 🛠️ Alternative Methods (If Automated Script Doesn't Work)

### Option A: Manual SSH Installation
```bash
# SSH to EC2
ssh -i /path/to/key.pem ubuntu@3.109.154.61

# Install Chromium
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y chromium-browser

# Verify
chromium-browser --version

# Clean cache
rm -rf ~/.cache/puppeteer ~/.cache/google-chrome

# Reinstall deps
cd /home/ubuntu/swaryoga-bridge
PUPPETEER_SKIP_DOWNLOAD=true npm ci

# Restart bridge
pm2 restart wa-bridge

# Verify
sleep 10
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://localhost:3333/status | jq '.hasQr'
```

### Option B: Docker Deployment (Recommended for future)
```bash
# Build image
docker build -f services/whatsapp-web/Dockerfile.production \
  -t swaryoga-bridge:latest .

# Run container
docker run -d \
  --name swaryoga-bridge \
  -p 3333:3333 \
  -e BRIDGE_SECRET=swar-bridge-secret-2024 \
  swaryoga-bridge:latest
```

---

## 📊 Diagnostic Tools Available

### Check QR Status
```bash
node scripts/qr-complete-diagnostic.js
```
**Output**: Full test report with troubleshooting guide

### Quick Status Check
```bash
node scripts/verify-qr-status.js
```
**Output**: Quick pass/fail on QR availability

### Run Bridge Tests
```bash
bash scripts/fix-qr-chromium.sh
```
**Output**: Available fix methods and commands

---

## 🧪 Testing After Installation

### 1. Verify Bridge is Responding
```bash
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://3.109.154.61:3333/status | jq '.'
```

Expected:
```json
{
  "status": "connected",
  "hasQr": true,
  "chatCount": 0
}
```

### 2. Check QR Endpoint
```bash
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://3.109.154.61:3333/qr | jq '.hasQr'
```

Expected: `true`

### 3. Browser Test
- Open: `https://crm.swaryoga.com`
- Go to: Admin → CRM → QR
- QR should appear within 15 seconds

---

## ⚡ If Something Goes Wrong

### Bridge Not Responding
```bash
# Check EC2 status
aws ec2 describe-instances --instance-ids i-0d2fb8b38cb190ffe --region ap-south-1

# SSH and restart
ssh -i key.pem ubuntu@3.109.154.61
pm2 restart wa-bridge
```

### Chromium Installation Failed
```bash
# Try manual install
sudo apt-get update
sudo apt-get install -y chromium-browser
chromium-browser --version

# If not found, try:
sudo snap install chromium
```

### QR Still Not Showing
```bash
# Check bridge logs
pm2 logs wa-bridge | tail -50

# Check disk space
df -h

# Check Chromium
which chromium-browser
chromium-browser --version

# Force restart
pm2 kill wa-bridge
pm2 start app.js --name wa-bridge
sleep 20
curl http://localhost:3333/qr
```

---

## 📋 Checklist

### Before Running Setup
- [ ] SSH access to EC2 (or AWS credentials for automation)
- [ ] 10-15 minutes available
- [ ] Internet connection stable
- [ ] EC2 instance running (`i-0d2fb8b38cb190ffe`)

### During Installation
- [ ] Running: `bash setup-permanent-solution.sh`
- [ ] Watching for completion messages
- [ ] Noting any error messages

### After Installation
- [ ] Run diagnostic: `node scripts/qr-complete-diagnostic.js`
- [ ] Check status: All tests should pass
- [ ] Browser test: QR visible at `crm.swaryoga.com/admin/crm/qr`
- [ ] Mobile test: Scan with WhatsApp
- [ ] Message test: Send a test message

---

## 🎯 Expected Outcome

**After ~15 minutes**:
- ✅ Chromium installed on EC2
- ✅ Bridge re-initialized
- ✅ QR code generating automatically
- ✅ Users can scan and connect
- ✅ Messages syncing
- ✅ Auto-healing enabled

---

## 📞 Debugging Information

**Bridge URL**: http://3.109.154.61:3333  
**Bridge Secret**: swar-bridge-secret-2024  
**EC2 Instance**: i-0d2fb8b38cb190ffe  
**Region**: ap-south-1  
**PM2 Service**: wa-bridge  

**Log Location**: `/home/ubuntu/swaryoga-bridge/logs/`  
**Config**: `/home/ubuntu/swaryoga-bridge/config.json`  

---

## 🎓 Understanding the Problem

**Why is QR not working?**
- WhatsApp Web automation requires a browser
- Puppeteer (npm package) needs Chromium to function
- Chromium was not installed on EC2

**Why was it never installed?**
- Initial setup focused on other components
- Bridge started but couldn't initialize WhatsApp Web client
- EC2 disk space issues previously (now fixed)

**How does the fix work?**
- Install system Chromium package
- Tell Puppeteer to use system Chromium
- Restart bridge service
- Bridge now has browser for WhatsApp Web automation
- QR code can be generated

---

## 🚀 Recommended: Complete Setup

For **maximum stability and auto-recovery**, run:

```bash
bash setup-permanent-solution.sh
```

This also enables:
- Auto-restart on crashes
- Health monitoring every 30 seconds
- Automatic recovery
- Log rotation
- Latest dependency updates
- Docker support

---

**Last Updated**: January 16, 2026  
**Status**: Ready for immediate action  
**Estimated Time to Complete**: 15 minutes
