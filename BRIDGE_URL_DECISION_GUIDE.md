# 🎯 Bridge URL Configuration - OLD vs NEW

## The Question: Which is Correct?

| Configuration | URL | For | Status |
|---|---|---|---|
| **OLD** | `http://192.168.1.100:3333` | Local Mac only | ❌ Doesn't work on domain |
| **NEW** | `https://swar-yoga-bridge.ngrok.io` | Production domain | ✅ Works on domain |

---

## When to Use Each

### OLD Configuration (192.168.1.100:3333)
```bash
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
```

**Use this ONLY for:**
- ✅ Local development (`localhost:3000`)
- ✅ Testing on your Mac at home
- ❌ NOT for production domain
- ❌ NOT for Vercel deployment

**Problem:** Local IP `192.168.1.100` cannot be reached from internet

---

### NEW Configuration (ngrok URL)
```bash
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://swar-yoga-bridge.ngrok.io
WHATSAPP_BRIDGE_HTTP_URL=https://swar-yoga-bridge.ngrok.io
```

**Use this for:**
- ✅ Production domain (`crm.swaryoga.com`)
- ✅ Vercel deployment
- ✅ Testing from external networks
- ✅ External device access

**Advantage:** ngrok creates a public tunnel to your local bridge

---

## Current Status

### Local Development (.env.local)
```
✅ NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://swar-yoga-bridge.ngrok.io
✅ WHATSAPP_BRIDGE_HTTP_URL=https://swar-yoga-bridge.ngrok.io
```

This works for:
- `https://crm.swaryoga.com/admin/crm/qr` ✅
- `http://localhost:3000/admin/crm/qr` ✅ (ngrok tunnel works locally too)

### Vercel Production
```
⏳ NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://swar-yoga-bridge.ngrok.io
⏳ WHATSAPP_BRIDGE_HTTP_URL=https://swar-yoga-bridge.ngrok.io
```

Still need to add these to Vercel!

---

## Decision Tree

```
Are you accessing from...?

├─ localhost:3000 (local dev)
│  ├─ OLD (192.168.1.100) ✅ Works
│  └─ NEW (ngrok) ✅ Works (via tunnel)
│
├─ crm.swaryoga.com (domain)
│  ├─ OLD (192.168.1.100) ❌ FAILS
│  └─ NEW (ngrok) ✅ Works
│
└─ External network
   ├─ OLD (192.168.1.100) ❌ FAILS
   └─ NEW (ngrok) ✅ Works
```

---

## Recommendation

**Use NEW (ngrok URL)** for everything right now:

✅ Works for local development
✅ Works for production domain
✅ Works for Vercel
✅ Works for external access
✅ Single configuration, no switching needed

---

## For Permanent Production (Future)

When you deploy bridge to EC2:
```bash
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
```

This will replace ngrok URL permanently.

---

## Summary

| Scenario | Use |
|----------|-----|
| Local dev only | OLD (192.168.1.100) |
| Local dev + domain testing | NEW (ngrok) ⭐ **RECOMMENDED** |
| Production only | NEW (ngrok) or EC2 |
| Permanent production | EC2 domain |

**Bottom Line**: Use the NEW ngrok URL - it works everywhere! 🚀
