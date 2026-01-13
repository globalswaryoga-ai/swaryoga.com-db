# 🔥 QUICK FIX - QR Not Opening on crm.swaryoga.com

## ⚡ Super Quick Fix (5 minutes)

### Step 1: Current Status ✅
```bash
# Local development - WORKING
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://localhost:3333
NEXT_BASE_URL=http://localhost:3000
```

### Step 2: For Production, Run This
```bash
# Update .env.local with your EC2 IP
node scripts/setup-domain.js crm.swaryoga.com YOUR_EC2_IP

# Example with real IP:
# node scripts/setup-domain.js crm.swaryoga.com 13.51.112.100
```

### Step 3: Deploy
```bash
npm run build
npm run start
# OR deploy to Vercel
```

## 🧪 Test It Works

```bash
# Local test (20 concurrent users)
npm run test:load
# Should show: ✅ System is HEALTHY - 100.00% success rate

# Production test
BASE_URL=https://crm.swaryoga.com npm run test:load:domain
```

## 🐛 Not Working? Debug

```bash
# Check bridge is running
curl http://localhost:3333/status

# Check configuration
grep NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL .env.local

# Check browser console (F12) for errors
# Look for: GET /api/admin/crm/whatsapp/qr-bridge?path=%2Fstatus
```

## 📍 What Each File Does

| File | Purpose |
|------|---------|
| `scripts/setup-domain.js` | Auto-update .env for domain |
| `scripts/test-domain-load.js` | Test 20 concurrent users |
| `QR_BRIDGE_FIX_SUMMARY.md` | Full setup guide |
| `QR_NOT_OPENING_FIX.md` | Troubleshooting details |
| `.env.local` | Configuration (with comments) |

## 🚀 Multi-Instance Setup (Later)

When you want a 2nd instance:
```bash
# Create 2nd EC2 instance
# Use load balancer: nginx → bridge1 (3333), bridge2 (3333)
# Test: npm run test:load:domain

# Should still show 100% success with more throughput
```

## ✅ Production Checklist

- [ ] EC2 instance running bridge
- [ ] Security group allows port 3333
- [ ] `.env.local` updated with EC2 IP
- [ ] DNS configured for crm.swaryoga.com
- [ ] `npm run build` completes
- [ ] Load test passes: `npm run test:load:domain`
- [ ] Deploy to production
- [ ] Test on production domain

## 🎯 That's It!

Everything is configured and tested. Ready to deploy! 🚀

---

**Local Status:** ✅ Working (20+ users tested)
**Production:** Ready after Step 2-3 above
**Support:** See QR_BRIDGE_FIX_SUMMARY.md
