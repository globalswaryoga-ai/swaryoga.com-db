# 🔍 Vercel Bridge Configuration Status

**Date**: January 13, 2026
**Issue**: QR bridge 500 errors on crm.swaryoga.com

## ✅ What's Configured in Vercel

Your Vercel environment variables show:

```
WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024
```

### Domain Resolution
```
wa-bridge.swaryoga.com → 3.80.11.153 (EC2)
```

## ❌ What's Not Working

**Bridge Server Status**: 🔴 **NOT RESPONDING**

The bridge server at `3.80.11.153:3333` is:
- ❌ Not accessible on port 3333
- ❌ Not responding to `/status` endpoint
- ❌ Likely not running or crashed

## 🔧 Possible Solutions

### Option 1: Check/Restart Bridge on EC2

You need to SSH into the EC2 instance and check the bridge:

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@3.80.11.153

# Check if bridge is running
ps aux | grep "node.*server.js"

# Check if port 3333 is listening
lsof -i:3333

# Check bridge logs
tail -50 /path/to/bridge/logs

# Restart bridge if needed
cd /path/to/bridge
node server.js
```

### Option 2: Use Your Mac Bridge Instead

You already have a working bridge on your Mac (192.168.1.100:3333).

**For development**: Keep using Mac
```env
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
```

**For production**: Use one of:

1. **ngrok Tunnel** (easiest, temporary)
   ```bash
   # On your Mac
   ngrok http 3333
   # Get URL like: https://abc123def456.ngrok.io
   
   # Add to Vercel
   NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://abc123def456.ngrok.io
   ```

2. **EC2 with Fixed IP** (permanent, requires EC2 maintenance)
   ```bash
   # Deploy bridge to EC2
   # Make sure port 3333 is open in security group
   # Update Vercel with EC2 IP
   NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://3.80.11.153:3333
   ```

### Option 3: Deploy Bridge to Your Server

Deploy the bridge code from your machine to the EC2 instance:

```bash
# From your Mac
scp -r deploy/wa-bridge/* ec2-user@3.80.11.153:/path/to/bridge/

# SSH and install/run
ssh ec2-user@3.80.11.153
cd /path/to/bridge
npm install
node server.js &
```

## 📊 Current Architecture

```
crm.swaryoga.com (Vercel)
    ↓
Vercel env vars:
  - NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
    ↓
wa-bridge.swaryoga.com → 3.80.11.153 (EC2)
    ↓
Node.js Bridge Server (Port 3333)
    ❌ NOT RUNNING / NOT RESPONDING
```

## ✅ What You Should Do

### Immediate Fix (5 minutes)
1. ✅ SSH into EC2 instance
2. ✅ Check if bridge is running: `ps aux | grep node`
3. ✅ Restart bridge if needed: `node server.js &`
4. ✅ Test: `curl http://3.80.11.153:3333/status`

### Short-term Fix (if EC2 bridge is unreliable)
1. ✅ Set up ngrok tunnel to your Mac bridge
2. ✅ Update Vercel env var to ngrok URL
3. ✅ Test QR endpoint

### Long-term Fix
1. ✅ Deploy bridge properly to EC2 with PM2/systemd
2. ✅ Keep ngrok as backup

## 🔗 Links & Commands

**Check EC2 Bridge Status**:
```bash
ssh -i your-key.pem ec2-user@3.80.11.153
ps aux | grep node
curl http://localhost:3333/status
```

**Vercel Environment Variables**:
https://vercel.com/swar-yoga-projects/swar-yoga-web-mohan/settings/environment-variables

**ngrok Setup** (if needed):
```bash
# Download: https://ngrok.com/download
./ngrok http 3333
```

## 📝 Summary

Your Vercel is **correctly configured** to use the bridge at `wa-bridge.swaryoga.com`. However, the **bridge server on EC2 is not responding**. You need to either:

1. **Fix the EC2 bridge** - SSH in and restart it
2. **Switch to ngrok** - Quick temporary solution
3. **Use your Mac bridge** - Works locally, need ngrok for production

---

**Next Action**: Check EC2 bridge status - is it still running?
