# 🚀 Vercel Environment Variables - WhatsApp QR Setup

## Current Status
- ✅ Local dev working with ngrok
- ❌ Production domain (Vercel) still using old local IP

## What Needs to be Added to Vercel

You need to add/update these two variables in your Vercel project:

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL` | `https://swar-yoga-bridge.ngrok.io` | Frontend bridge access |
| `WHATSAPP_BRIDGE_HTTP_URL` | `https://swar-yoga-bridge.ngrok.io` | Server-side bridge access |

---

## How to Add to Vercel

### Option 1: Via Vercel Dashboard (Easy) ⭐

1. Go to: **https://vercel.com/dashboard**
2. Select your project: **swar-yoga-web-mohan** (or your project name)
3. Click **Settings** tab
4. Click **Environment Variables** (left sidebar)
5. Click **Add New** button
6. Fill in:
   - **Name**: `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL`
   - **Value**: `https://swar-yoga-bridge.ngrok.io`
   - **Environments**: Select `Production` and `Preview`
7. Click **Save**
8. Repeat for `WHATSAPP_BRIDGE_HTTP_URL`

### Option 2: Via Vercel CLI

```bash
vercel env add NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL
# Enter value: https://swar-yoga-bridge.ngrok.io
# Select: production, preview, development

vercel env add WHATSAPP_BRIDGE_HTTP_URL
# Enter value: https://swar-yoga-bridge.ngrok.io
# Select: production, preview, development
```

---

## After Adding to Vercel

1. **Redeploy** your Vercel project:
   - Push code to main branch, OR
   - Click "Redeploy" button in Vercel dashboard

2. **Clear browser cache**: `Cmd+Shift+R` on Mac

3. **Test on production domain**:
   - Visit: `https://crm.swaryoga.com/admin/crm/qr`
   - Click "Login (QR)"
   - QR code should appear ✅

---

## ⚠️ Important Notes

### ngrok URL Expiration
- **Free plan**: Token expires after 2 hours of inactivity
- **Pro plan**: 24/7 uptime (recommended for production)
- **Solution**: Either upgrade ngrok or deploy bridge to EC2 permanently

### For Permanent Production Setup
Instead of ngrok, deploy bridge to EC2:
- Use: `https://wa-bridge.swaryoga.com` (EC2 domain)
- Update Vercel env vars to point to EC2
- No expiration, always available

See `EC2_BRIDGE_CHECKLIST.md` for EC2 deployment.

---

## Quick Checklist

- [ ] Go to Vercel Dashboard
- [ ] Find your project settings
- [ ] Add `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL` = `https://swar-yoga-bridge.ngrok.io`
- [ ] Add `WHATSAPP_BRIDGE_HTTP_URL` = `https://swar-yoga-bridge.ngrok.io`
- [ ] Select `Production` + `Preview` for both
- [ ] Redeploy project
- [ ] Clear browser cache
- [ ] Test on `crm.swaryoga.com/admin/crm/qr` ✅

---

**Status**: Ready to deploy
**Last Updated**: January 13, 2026
