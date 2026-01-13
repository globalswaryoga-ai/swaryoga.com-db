# WhatsApp QR Code - Troubleshooting Guide

**Quick Reference**: `https://crm.swaryoga.com/admin/crm/qr`

---

## 🔴 QR Code Not Displaying

### Symptom: Page says "Loading bridge..." indefinitely

**Diagnostic Steps**:
```bash
# 1. Check ngrok is running
ps aux | grep ngrok

# Expected output:
# ngrok http 3333 --subdomain=swar-yoga-bridge

# 2. Check local bridge is accessible
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://localhost:3333/status

# Expected: {"status":"qr","hasQr":true,...}

# 3. Check ngrok tunnel is accessible
curl -I https://swar-yoga-bridge.ngrok.io/status

# Expected: HTTP/2 200
```

**If ngrok is down**:
```bash
# Restart ngrok
ngrok http 3333 --subdomain=swar-yoga-bridge

# Then check Vercel environment variables match the new URL
# (ngrok URL shouldn't change with saved token)
```

**If local bridge is down**:
```bash
# Check if WhatsApp Web Bridge process is running
ps aux | grep bridge

# If not running, start it
# (instructions in README or startup script)
```

**If Vercel environment variables are wrong**:
```bash
# Verify in Vercel Dashboard:
# https://vercel.com/swaryogaprojects/swar-yoga-web-mohan/settings/environment-variables

# Should show:
# NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL = https://swar-yoga-bridge.ngrok.io
# WHATSAPP_BRIDGE_HTTP_URL = https://swar-yoga-bridge.ngrok.io

# If not, update and trigger redeploy:
git commit --allow-empty -m "trigger: redeploy" && git push origin main
```

---

## 🔴 QR Code Displays but Can't Scan

### Symptom: Image shows but "invalid" when scanning

**Causes**:
1. QR is for old/expired session
2. Bridge crashed mid-QR generation
3. Browser cached stale QR

**Fix**:
```bash
# 1. Hard refresh (clears cache)
# macOS: Cmd+Shift+R
# Windows: Ctrl+Shift+R

# 2. Close and reopen QR page

# 3. Wait 30 seconds for new QR (auto-refresh)

# 4. Check bridge status directly
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://localhost:3333/status
# Look for "hasQr": true
```

---

## 🔴 "Unauthorized bridge access" Error

### Symptom: Bridge responds but says not authorized

**Cause**: Bridge secret mismatch

**Fix**:
```bash
# Check .env.local has correct secret
grep WHATSAPP_.*BRIDGE_SECRET .env.local

# Should show:
# NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
# WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024

# Verify Vercel has same value:
# https://vercel.com/.../settings/environment-variables
# NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET = swar-bridge-secret-2024
# WHATSAPP_WEB_BRIDGE_SECRET = swar-bridge-secret-2024
```

---

## 🔴 Messages Not Sending

### Symptom: Click send → No error but message doesn't appear

**Diagnostic**:
```bash
# 1. Check browser console for errors
# Open DevTools: F12 → Console tab
# Send a message and watch for red errors

# Expected behavior:
# ✅ POST /api/admin/crm/whatsapp/qr/send → 200 {success:true}

# 2. Check database
mongosh --eval "use swaryoga_admin_crm; db.whatsapp_messages.find({direction:'outbound'}).sort({createdAt:-1}).limit(5)"

# Should see your message in recent records
```

**If message isn't in DB**:
1. Bridge send failed (check bridge logs)
2. DB connection issue (check MongoDB Atlas)
3. Authentication failed (check JWT token)

**If message is in DB but not in WhatsApp**:
- Bridge bug (unlikely, but check bridge logs)
- Phone number format issue (should be: `1234567890@c.us`)
- Bridge session expired (restart bridge)

---

## 🔴 "Bridge timeout" Error

### Symptom: Request hangs for 12 seconds then fails

**Causes**:
1. ngrok tunnel slow/down (network issue)
2. Local bridge frozen
3. Vercel region far from bridge

**Fix**:
```bash
# 1. Check ngrok status
ps aux | grep ngrok
curl -s http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'

# 2. Check ngrok traffic
# Visit: http://localhost:4040 in browser
# Look for failed requests (red indicators)

# 3. Restart if needed
pkill -f "ngrok http"
sleep 2
ngrok http 3333 --subdomain=swar-yoga-bridge
```

---

## 🔴 ngrok Token Expired (Free Plan)

### Symptom: Tunnel dies after 2 hours

**Expected for free plan**: Automatic disconnect after 2 hours of inactivity

**Restart**:
```bash
pkill -f "ngrok http"
sleep 2
ngrok http 3333 --subdomain=swar-yoga-bridge
```

**Prevent in future**:
1. **Option A**: Upgrade ngrok to paid ($5/month)
   ```bash
   ngrok config upgrade
   # Follow prompts
   ```

2. **Option B**: Deploy bridge to EC2 (permanent)
   - See `EC2_BRIDGE_DEPLOYMENT.md`

3. **Option C**: Keep activity (polling every 30s prevents timeout)

---

## 🟡 QR Refreshes Too Frequently

### Symptom: QR code changes every 10 seconds

**Cause**: Bridge configured for fast refresh (security feature)

**Expected Behavior**: QR updates every 30 seconds or on reconnect

**If abnormal**:
```bash
# 1. Check bridge hasn't crashed and restarted
ps aux | grep bridge | head -1
# Note the start time

# 2. Check bridge logs
# (location depends on bridge setup)

# 3. Try restarting bridge
pkill -f bridge
sleep 3
# Start bridge again (as per startup instructions)
```

---

## 🟡 Chats Not Showing in Sidebar

### Symptom: QR page loads but chat list is empty

**Causes**:
1. Bridge has no chats yet (normal for new session)
2. API call failing silently
3. User permissions issue

**Diagnostic**:
```bash
# 1. Check browser console (DevTools → Console)
# Look for errors when page loads

# 2. Check network tab
# Look for /api/admin/crm/whatsapp/qr/chats
# Response should be: {success:true, chats:[...]}

# 3. Verify token is valid
# Open localStorage:
# DevTools → Application → LocalStorage → admin_user
# Should have: {userId, isAdmin:true, permissions:[...]}

# 4. Check bridge has chats
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://localhost:3333/chats | jq '.chats | length'
# Should be > 0 if you've received messages
```

**If bridge has no chats**:
- Normal for fresh QR scan
- Receive a message from WhatsApp first
- Chats populate automatically

**If API returns error**:
```bash
# Check Vercel logs
# https://vercel.com/swaryogaprojects/.../logs

# Look for errors in:
# /api/admin/crm/whatsapp/qr/chats
```

---

## 🟢 Performance Optimization

### QR takes >5s to display

**Solution**:
```bash
# 1. Check network latency to ngrok
ping swar-yoga-bridge.ngrok.io
# Should be <200ms

# 2. Check Vercel region
# Visit: https://caniuse.vercel.app/ (not real, just concept)
# If >300ms latency, it's a Vercel region issue

# 3. Check local bridge performance
# Time the local request:
time curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://localhost:3333/status

# Should be <500ms
```

---

## ✅ Verification Checklist

Run this to confirm everything works:

```bash
#!/bin/bash

echo "🔍 WhatsApp QR Verification Checklist"
echo "======================================"

echo -n "✓ ngrok running? "
if pgrep -f "ngrok http" > /dev/null; then echo "YES"; else echo "NO"; fi

echo -n "✓ Bridge accessible? "
if curl -s http://localhost:3333/status > /dev/null 2>&1; then echo "YES"; else echo "NO"; fi

echo -n "✓ ngrok tunnel accessible? "
if curl -s -I https://swar-yoga-bridge.ngrok.io/status | grep -q 200; then echo "YES"; else echo "NO"; fi

echo -n "✓ Vercel environment vars set? "
grep -q "NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://swar-yoga-bridge.ngrok.io" .env.local && echo "YES" || echo "NO"

echo -n "✓ Git status clean? "
if [ -z "$(git status -s)" ]; then echo "YES"; else echo "NO"; fi

echo ""
echo "If all ✓, you're ready to test!"
echo "Visit: https://crm.swaryoga.com/admin/crm/qr"
```

Run it:
```bash
bash verification-checklist.sh
```

---

## 📞 Emergency Contacts

| Issue | Action | Contact |
|-------|--------|---------|
| ngrok token expired | Restart tunnel | `ngrok http 3333 --subdomain=swar-yoga-bridge` |
| Local bridge crashed | Restart bridge | Depends on bridge startup (check README) |
| Vercel build failed | Check logs | https://vercel.com/.../logs |
| MongoDB unreachable | Check Atlas dashboard | https://account.mongodb.com |
| Still stuck? | Manual diagnosis | Check QR_CODE_AUDIT_REPORT.md |

---

**Last Updated**: January 13, 2026  
**Commit**: `3bde675`  
**Status**: 🟢 READY FOR TESTING
