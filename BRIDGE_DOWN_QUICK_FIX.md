# 🔴 Bridge Down - Quick Troubleshoot

**Problem**: QR not loading on crm.swaryoga.com (500 errors)
**Cause**: Bridge at `wa-bridge.swaryoga.com` (EC2) is not responding
**Severity**: 🔴 Critical - QR functionality broken

---

## ⚡ QUICK FIXES (in order)

### 1. Check EC2 Bridge (5 min) ✅ FASTEST
```bash
# You need: EC2 key file, EC2 IP (3.80.11.153)

# SSH into EC2
ssh -i /path/to/your-key.pem ec2-user@3.80.11.153

# Check if node is running
ps aux | grep node

# If not running, check logs
ls -la /path/to/bridge/
tail -20 bridge.log

# Start bridge
cd /path/to/bridge && node server.js &
```

**Status Check**:
```bash
curl http://localhost:3333/status
```

---

### 2. Use ngrok (10 min) ✅ WORKS IMMEDIATELY
```bash
# On your Mac terminal
brew install ngrok

# Start tunnel to your Mac bridge
ngrok http 3333
# You'll get: https://abc123def456.ngrok.io

# Update Vercel:
# NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://abc123def456.ngrok.io
```

**Test**:
```bash
curl https://abc123def456.ngrok.io/status
```

---

### 3. Deploy Bridge to EC2 (30 min) ✅ PERMANENT
```bash
# Copy bridge files to EC2
scp -r /Users/mohankalburgi/swaryoga.com-db/deploy/wa-bridge/* \
  ec2-user@3.80.11.153:/home/ec2-user/wa-bridge/

# SSH and start
ssh ec2-user@3.80.11.153
cd /home/ec2-user/wa-bridge
npm install
node server.js > bridge.log 2>&1 &
```

---

## 📋 Diagnostic Commands

**On your Mac**:
```bash
# Is your local bridge running?
lsof -i:3333
# Should show: node  37971  ... TCP localhost:3333

# Test it
curl -H "x-bridge-secret: swar-bridge-secret-2024" http://192.168.1.100:3333/status

# Check Vercel env
curl https://crm.swaryoga.com/api/health
```

**On EC2** (if you have SSH access):
```bash
# Is port 3333 open?
sudo netstat -tulpn | grep 3333

# Try to start bridge
cd /path/to/bridge && node server.js

# Check security group
# AWS Console → Security Groups → Check inbound rules for port 3333
```

---

## 🎯 RECOMMENDED ACTION

Pick one:

**Option A**: Use Mac Bridge + ngrok (FASTEST ⚡)
```bash
# 1. Install ngrok
brew install ngrok

# 2. Start tunnel
ngrok http 3333

# 3. Copy the URL (something like https://abc123.ngrok.io)

# 4. Update Vercel env var:
# NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=<your-ngrok-url>

# 5. Redeploy: git push or vercel --prod

# Result: QR will work on crm.swaryoga.com
```

**Option B**: Fix EC2 Bridge (PERMANENT ✅)
```bash
# 1. SSH to EC2
ssh -i your-key.pem ec2-user@3.80.11.153

# 2. Restart bridge
cd /path/to/bridge && node server.js &

# 3. Verify
curl http://localhost:3333/status

# Result: Bridge should respond
```

---

## ❓ Questions to Answer

- [ ] Do you have EC2 SSH access? If yes, which key file?
- [ ] Do you want to use ngrok or fix EC2?
- [ ] Should QR work immediately or can you wait for EC2 fix?

---

## 🔗 Resources

- **EC2 IP**: 3.80.11.153
- **Bridge Domain**: wa-bridge.swaryoga.com
- **Vercel Settings**: https://vercel.com/swar-yoga-projects/swar-yoga-web-mohan/settings/environment-variables
- **ngrok**: https://ngrok.com
- **AWS Console**: https://console.aws.amazon.com

---

**Status**: 🔴 **CRITICAL** - QR bridge not working
**ETA to Fix**: 5-30 minutes depending on option chosen
