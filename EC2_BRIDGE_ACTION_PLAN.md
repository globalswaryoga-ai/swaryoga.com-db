# EC2 Bridge Fix - Complete Action Plan

## 🎯 What Needs to Be Done

The EC2 WhatsApp bridge service is **not running the correct code**. It needs to be **restarted immediately**.

---

## 🚀 Action Items (In Order)

### 1️⃣ SSH to EC2 Instance
```bash
ssh -i your-ec2-key.pem ec2-user@52.91.198.23
```

### 2️⃣ Run the Automated Restart Script
```bash
# From your Mac, copy the script to EC2 first, OR
# SSH to EC2 and download it:

cd /tmp
curl https://raw.githubusercontent.com/globalswaryoga-ai/swaryoga.com-db/main/ec2-bridge-restart.sh -o restart.sh
chmod +x restart.sh

# Edit the script to update BRIDGE_PATH if needed
nano restart.sh  # Update BRIDGE_PATH to your actual path

# Run it
./restart.sh
```

### 3️⃣ Or Do Manual Restart (If Preferred)

Follow the exact commands in: [EC2_BRIDGE_DIRECT_COMMANDS.md](EC2_BRIDGE_DIRECT_COMMANDS.md)

Quick version:
```bash
# Stop everything
sudo lsof -ti:3333 | xargs sudo kill -9 2>/dev/null || true
docker stop $(docker ps | grep whatsapp | awk '{print $1}') 2>/dev/null || true
pm2 stop bridge && pm2 delete bridge 2>/dev/null || true

# Navigate to bridge
cd ~/deploy/wa-bridge  # Update path as needed

# Start with Docker
docker-compose down && sleep 2 && docker-compose up -d

# Or with PM2
npm install --production && pm2 start server.js --name bridge

# Verify
curl -H "x-bridge-secret: swar-bridge-secret-2024" http://localhost:3333/health
# Should return: {"ok": true, "port": 3333}
```

### 4️⃣ Test from Your Mac
```bash
cd /Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db
./test-bridge-health.sh http://52.91.198.23:3333 swar-bridge-secret-2024

# All tests should show ✅
```

### 5️⃣ Verify in Browser
1. Open: `https://swaryoga.com/admin/crm/qr`
2. Check browser console (F12) - no errors
3. Check that chats load (not "Falling back to cached chats")
4. Send a test message - should appear immediately

---

## 📋 Documentation Available

| Document | Purpose |
|----------|---------|
| **[EC2_BRIDGE_DIRECT_COMMANDS.md](EC2_BRIDGE_DIRECT_COMMANDS.md)** | Copy-paste ready commands |
| **[ec2-bridge-restart.sh](ec2-bridge-restart.sh)** | Automated restart script |
| **[test-bridge-health.sh](test-bridge-health.sh)** | Test bridge endpoints |
| **[EC2_BRIDGE_VERIFICATION_CHECKLIST.md](EC2_BRIDGE_VERIFICATION_CHECKLIST.md)** | Step-by-step verification |
| **[BRIDGE_FIX_SOLUTION.md](BRIDGE_FIX_SOLUTION.md)** | Root cause analysis |

---

## ✅ Success Criteria

After restart, verify these all work:

```bash
# From EC2
curl -H "x-bridge-secret: swar-bridge-secret-2024" http://localhost:3333/health
# Returns: {"ok": true, "port": 3333}

curl -H "x-bridge-secret: swar-bridge-secret-2024" http://localhost:3333/chats
# Returns: {"chats": [...]} with list of chats

curl -H "x-bridge-secret: swar-bridge-secret-2024" http://localhost:3333/status
# Returns: connection status

# From your Mac
./test-bridge-health.sh
# All tests show ✅

# From Browser
https://swaryoga.com/admin/crm/qr
# Chats load without "Falling back to cache" message
# Send message appears immediately
```

---

## 🔍 If Issues Occur

Refer to troubleshooting section in: [EC2_BRIDGE_DIRECT_COMMANDS.md](EC2_BRIDGE_DIRECT_COMMANDS.md)

Common issues:
- **404 errors**: Bridge code missing endpoints
- **"Cannot connect"**: Browser automation issue
- **Timeouts**: EC2 resource issue
- **Logs show errors**: Check auth session, disk space, memory

---

## ⏱️ Estimated Time

| Step | Time |
|------|------|
| SSH to EC2 | 1 min |
| Stop old service | 2 min |
| Start new service | 2 min |
| Verify endpoints | 2 min |
| Test from Mac | 2 min |
| Browser verification | 5 min |
| **Total** | **~15 min** |

---

## 🔐 Important Notes

1. **Bridge Secret**: `swar-bridge-secret-2024` (already in .env)
2. **Bridge URL**: `http://52.91.198.23:3333` (EC2 internal)
3. **Port**: `3333` (the service port)
4. **Session Dir**: `/tmp/.wwebjs_auth` (browser automation session)

If restart fails:
- Check directory path is correct
- Verify server.js has whatsapp-web.js code
- Check EC2 has Chrome/Chromium installed
- Check EC2 has enough memory (2GB+)
- Check EC2 can reach WhatsApp servers

---

## 📊 After Fix: What Changes

| Before | After |
|--------|-------|
| ❌ /chats returns 404 | ✅ /chats returns chat list |
| ❌ QR page shows "Bridge error" | ✅ QR page loads chats |
| ❌ Falls back to stale cache | ✅ Real-time chat updates |
| ❌ Messages don't appear in QR | ✅ Messages appear immediately |
| ❌ No real-time sync | ✅ Real-time message sync |

---

## 🎓 What Happened

The EC2 bridge process (whatsapp-web.js) crashed or was replaced. When tested:
- Server responds on port 3333 ✅
- But it's just default Express ❌
- Missing all whatsapp-web.js endpoints ❌
- Returns 404 on /health, /chats, etc. ❌

**Solution**: Restart the service with the correct code

---

## 📝 Git History

Related commits:
- **8cd7915**: Added verification checklist
- **fe0ea95**: Added restart procedures and direct commands
- **5fefe2e**: Added diagnostic reports
- **cac88b2**: Added health check tools

---

## Next Steps

1. **Now**: SSH to EC2
2. **Execute**: Restart procedure
3. **Test**: Health check script
4. **Verify**: Browser and message sending
5. **Monitor**: Keep bridge running (set up auto-restart in next task)

---

**Status**: Ready for EC2 restart  
**Created**: Jan 19, 2025  
**Owner**: @mohankalburgi  
**Priority**: HIGH (users can't use QR interface)

