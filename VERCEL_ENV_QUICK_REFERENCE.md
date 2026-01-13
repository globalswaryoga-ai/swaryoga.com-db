# ⚡ Quick Vercel Environment Setup

**Problem**: 401 errors on crm.swaryoga.com (missing env vars)
**Solution**: Add environment variables to Vercel

## 🎯 Quick Steps

### 1. Open Vercel Dashboard
https://vercel.com/swar-yoga-projects/swar-yoga-web-mohan/settings/environment-variables

### 2. Run This Script to Generate Env List
```bash
cd /Users/mohankalburgi/swaryoga.com-db
node scripts/set-vercel-env.js > /tmp/vercel-env.txt
cat /tmp/vercel-env.txt
```

### 3. Copy All Variables
Select all output and copy to clipboard

### 4. Add to Vercel (One by One)
- Click "Add New"
- Paste: `NAME=VALUE`
- Select: ✅ Production, ✅ Preview, ✅ Development
- Click "Add"

**Key Variables** (set first):
- `MONGODB_URI_MAIN` (database connection)
- `WHATSAPP_ACCESS_TOKEN` (Meta API)
- `NEXTAUTH_URL=https://crm.swaryoga.com` (⚠️ Important!)
- `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333`
- `WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333`
- `NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024`

### 5. Deploy
```bash
git push origin main
# or
vercel --prod
```

### 6. Test
```bash
# Wait 1-2 mins for Vercel to propagate
curl https://crm.swaryoga.com/admin/crm/qr

# Should see QR code, not 401 error
```

## ❌ Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Auth failure | Missing `JWT_SECRET` or `NEXTAUTH_URL` | Add both to Vercel |
| 500 QR Bridge error | Missing bridge URLs | Add `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL` |
| Bridge timeout | Bridge not accessible | Use ngrok or EC2 for production |

## 📝 Bridge URL Options for Production

```
Development (localhost):
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333

Production ngrok:
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://abc123def456.ngrok.io

Production EC2:
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://YOUR_EC2_IP:3333
```

## 🔗 Links
- **Vercel Settings**: https://vercel.com/swar-yoga-projects/swar-yoga-web-mohan/settings/environment-variables
- **Detailed Guide**: See `VERCEL_ENV_SETUP.md` in repo
- **Generated Env**: `scripts/set-vercel-env.js`

---

**Estimated Time**: 5-10 minutes to complete
