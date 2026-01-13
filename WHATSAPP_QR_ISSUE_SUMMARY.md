# WhatsApp QR Not Opening on crm.swaryoga.com - ROOT CAUSE & SOLUTION

## 🔴 What's Wrong

When you try to access **WhatsApp QR** on the production domain `crm.swaryoga.com/admin/crm/qr`:
- Click "Login (QR)" button
- Modal opens with "Generating QR..." message
- **QR code never appears** ❌
- Modal stays stuck

---

## 🔍 Root Cause Identified

### The Issue
1. **Bridge Server**: Running locally at `http://192.168.1.100:3333` on your Mac ✅
2. **Environment Variable**: 
   ```bash
   NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
   ```
3. **Browser Accessing Domain**: Using `crm.swaryoga.com` (production domain)

### Why It Fails
- When your browser visits `crm.swaryoga.com` from **any external network**
- Frontend JavaScript tries to reach: `http://192.168.1.100:3333`
- **Local IP addresses are not routable from the internet** ❌
- Request hangs, QR code never loads

### Network Diagram
```
┌─────────────────────┐
│  Your Browser       │
│ crm.swaryoga.com    │
└──────────┬──────────┘
           │ (tries to reach)
           ↓
┌─────────────────────────────┐
│ 192.168.1.100:3333          │  ❌ UNREACHABLE
│ (Local Mac IP - private)    │
│ Bridge is here ✅            │
└─────────────────────────────┘
```

---

## ✅ Solution

### Option 1: Use ngrok (Quick & Easy) ⭐ **RECOMMENDED FOR NOW**

**Step 1**: Start ngrok tunnel in a new terminal
```bash
ngrok http 3333 --subdomain=swar-yoga-bridge
```

You'll see output like:
```
Forwarding                    https://swar-yoga-bridge.ngrok.io -> http://localhost:3333
```

**Step 2**: Update `.env.local`
```bash
# OLD (doesn't work from domain):
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333

# NEW (works from anywhere):
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://swar-yoga-bridge.ngrok.io
```

**Step 3**: Restart dev server
```bash
npm run dev -- --port 3020
```

**Step 4**: Test
- Visit: `https://crm.swaryoga.com/admin/crm/qr`
- Click "Login (QR)"
- **QR code appears!** ✅

---

### Option 2: Deploy to EC2 (Permanent) 🏢

If you want a permanent solution without ngrok:

1. Deploy bridge code to EC2 instance (`3.80.11.153`)
2. Configure Nginx to forward `wa-bridge.swaryoga.com` → bridge server
3. Update environment:
   ```bash
   NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
   ```

See `EC2_BRIDGE_CHECKLIST.md` for detailed setup.

---

## 🚀 Recommended Approach

### For Development (Right Now)
✅ **Use ngrok** - Takes 2 minutes to set up

### For Production (Later)
✅ **Deploy to EC2** - Permanent, no expiration

---

## 📋 Implementation Steps (ngrok)

```bash
# Terminal 1: Start ngrok
ngrok http 3333 --subdomain=swar-yoga-bridge

# Terminal 2: Update .env.local
# (Edit file and change BRIDGE_HTTP_URL to ngrok URL)

# Terminal 3: Restart dev server
npm run dev -- --port 3020

# Test in browser
# Visit: https://crm.swaryoga.com/admin/crm/qr
# Click: "Login (QR)" button
# Expected: QR code appears ✅
```

---

## 🧪 Verification

### ✅ You'll Know It's Fixed When:
1. QR modal opens
2. QR code image displays in the modal
3. You can scan it with WhatsApp
4. Device connects successfully

### 🔴 If Still Not Working:
Check browser DevTools (F12) → Network tab:
- Look for `/api/admin/crm/whatsapp/qr-bridge?path=/status` request
- Should return `200 OK` status
- If `500` or timeout: ngrok tunnel may have expired

---

## 💡 Key Points

| Scenario | URL | Result |
|----------|-----|--------|
| localhost development | `http://localhost:3333` | ✅ Works |
| crm.swaryoga.com with local IP | `http://192.168.1.100:3333` | ❌ Fails |
| crm.swaryoga.com with ngrok | `https://swar-yoga-bridge.ngrok.io` | ✅ Works |
| crm.swaryoga.com with EC2 | `https://wa-bridge.swaryoga.com` | ✅ Works |

---

## ⚠️ Important

- **ngrok sessions expire** after 2 hours of inactivity on free plan
- **EC2 deployment is permanent** - no expiration
- Always use **HTTPS URLs** for production domains (ngrok provides this)
- **Bridge secret** must match: `swar-bridge-secret-2024`

---

**Status**: 🟢 **SOLUTION READY TO IMPLEMENT**

See `WHATSAPP_QR_FIX_PRODUCTION_DOMAIN.md` for detailed guide.
Run `bash fix-qr-production.sh` to automate the setup.
