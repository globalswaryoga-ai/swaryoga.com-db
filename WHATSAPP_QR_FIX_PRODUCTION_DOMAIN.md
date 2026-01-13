# 🔧 WhatsApp QR Not Opening on Production Domain - FIX

## 🔴 Problem
When accessing `crm.swaryoga.com`, the WhatsApp QR modal shows "Generating QR..." but never displays the code.

### Root Cause
- **Local Bridge**: Running at `http://192.168.1.100:3333` ✅ (on your Mac)
- **Production Domain**: Accessing `crm.swaryoga.com` 🌐
- **Issue**: Browser cannot reach local IP `192.168.1.100` from external network

The environment variables point to:
```
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
```

When `crm.swaryoga.com` tries to call this URL from the browser, it fails because the local IP is only accessible on your local network.

---

## ✅ Solution: Use ngrok to Expose Local Bridge

### Step 1: Start ngrok Tunnel
```bash
ngrok http 3333 --subdomain=swar-yoga-bridge
```

**Output will be:**
```
Forwarding https://swar-yoga-bridge.ngrok.io -> http://localhost:3333
```

**Note**: The exact URL depends on your ngrok plan. If you don't have a custom subdomain, use the dynamic URL provided.

### Step 2: Update `.env.local`

Replace these lines:
```bash
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
```

With the ngrok URL:
```bash
# For production domain access, use ngrok tunnel
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://swar-yoga-bridge.ngrok.io
WHATSAPP_BRIDGE_HTTP_URL=https://swar-yoga-bridge.ngrok.io
```

### Step 3: Restart the Next.js Development Server
```bash
# Kill current server (Ctrl+C)
npm run dev -- --port 3020
```

### Step 4: Test on Production Domain
```
https://crm.swaryoga.com/admin/crm/qr
```

Click **"Login (QR)"** → QR code should now appear! ✅

---

## 🚀 Alternative: Deploy Bridge to EC2 (Permanent Solution)

Once you want a permanent setup without ngrok:

1. Deploy the bridge to EC2 instance (IP: `3.80.11.153`)
2. Run Nginx to forward `wa-bridge.swaryoga.com` → bridge server
3. Update environment variables:
   ```bash
   NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
   WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
   ```

See `EC2_BRIDGE_CHECKLIST.md` for EC2 deployment steps.

---

## 📝 Important Notes

### For Local Development
Keep using local IP for localhost testing:
```bash
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://localhost:3333
```

### For Domain Access
Must use either:
- ✅ **ngrok URL** (temporary, great for testing)
- ✅ **EC2 domain** `wa-bridge.swaryoga.com` (permanent)
- ✅ **Public IP with HTTPS** (must have valid SSL cert)

### ngrok Session Duration
- Free plan: Session expires after ~2 hours of inactivity
- Pro plan: 24/7 uptime
- Solution: Restart ngrok if you see connection errors

---

## 🧪 Testing Checklist

- [ ] ngrok tunnel is running (`ngrok http 3333`)
- [ ] Updated `.env.local` with ngrok URL
- [ ] Restarted Next.js dev server
- [ ] Cleared browser cache (`Cmd+Shift+R` on Mac)
- [ ] Visit `https://crm.swaryoga.com/admin/crm/qr`
- [ ] Click "Login (QR)" button
- [ ] QR code appears in modal
- [ ] Scan with WhatsApp on phone
- [ ] Connection successful ✅

---

## 🆘 Troubleshooting

### "Connection refused" error
- Check if ngrok is still running
- Restart ngrok: `ngrok http 3333`
- Verify URL in browser network tab

### "Bridge secret mismatch" error
- Verify `WHATSAPP_WEB_BRIDGE_SECRET` in `.env.local` matches bridge config
- Default: `swar-bridge-secret-2024`

### QR still not showing
1. Open browser DevTools → Network tab
2. Click "Login (QR)" button
3. Check if `/api/admin/crm/whatsapp/qr-bridge?path=/status` request succeeds
4. If 500 error, check bridge is running: `curl http://localhost:3333/status`

---

**Last Updated**: January 13, 2026
**Status**: Ready for implementation
