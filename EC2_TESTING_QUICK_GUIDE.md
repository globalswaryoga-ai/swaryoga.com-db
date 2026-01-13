# 🚀 WhatsApp Bridge - EC2 LIVE Testing Guide

## ✅ Status: READY FOR TESTING

**EC2 Instance**: 3.109.154.61  
**Bridge Port**: 3333  
**Vercel Domain**: https://crm.swaryoga.com  
**QR Page**: https://crm.swaryoga.com/admin/crm/qr  

---

## 🧪 Quick Testing Steps

### Step 1: Wait for Vercel Redeploy (2-3 min)
Vercel auto-detects git push and redeploys. Estimated completion: ~05:05 UTC

### Step 2: Test QR Page
```
1. Open: https://crm.swaryoga.com/admin/crm/qr
2. Login with admin credentials (if required)
3. Expected: WhatsApp QR code displays
4. Try: Scan with WhatsApp on phone
```

### Step 3: Verify Bridge Connection (Terminal)
```bash
# From EC2
ssh -i ~/.ssh/swar-yoga-bridge-key.pem ubuntu@3.109.154.61

# Inside EC2, test bridge
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://localhost:3333/status
```

**Expected Response:**
```json
{"status":"qr","hasQr":true,"sessionReady":false,"timestamp":"..."}
```

### Step 4: Check Bridge Logs (if issues)
```bash
ssh -i ~/.ssh/swar-yoga-bridge-key.pem ubuntu@3.109.154.61
pm2 logs whatsapp-bridge --lines 50
```

---

## 📊 Current Configuration

**File**: `.env.local`

```
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://3.109.154.61:3333
WHATSAPP_BRIDGE_HTTP_URL=http://3.109.154.61:3333
WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
```

---

## 🎯 Success Criteria

✅ QR page loads without errors  
✅ QR code displays (not 404, not timeout)  
✅ QR code scannable with WhatsApp  
✅ Bridge logs show successful connections  
✅ No "Unauthorized" errors in logs  

---

## 🚨 Troubleshooting

### If QR page shows 404 or timeout:
1. Wait 3 more minutes for Vercel redeploy
2. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Check bridge logs: `pm2 logs whatsapp-bridge`

### If bridge shows "Unauthorized":
- Verify header: `X-Bridge-Secret: swar-bridge-secret-2024`
- Check .env.local configuration
- Restart bridge: `pm2 restart whatsapp-bridge`

### If EC2 unreachable:
- Check security group allows port 3333
- Verify EC2 instance is running
- Check network connectivity

---

## 📞 Quick Commands

```bash
# SSH into EC2
ssh -i ~/.ssh/swar-yoga-bridge-key.pem ubuntu@3.109.154.61

# View status
pm2 status

# View logs
pm2 logs whatsapp-bridge --lines 20

# Restart if needed
pm2 restart whatsapp-bridge

# View all processes
pm2 list
```

---

## ⏱️ Timeline

| Time | Action | Status |
|------|--------|--------|
| 04:57 | EC2 instance created | ✅ |
| 05:00 | Bridge server deployed | ✅ |
| 05:02 | Bridge confirmed online | ✅ |
| 05:04 | Environment updated | ✅ |
| 05:05 | Vercel redeploy triggered | 🔄 In Progress |
| 05:07-05:08 | QR page live | ⏳ Expected |
| 05:10+ | Ready for testing | ⏳ Expected |

---

## 📈 Resources

- **EC2 Dashboard**: https://console.aws.amazon.com/ec2/
- **Vercel Deployments**: https://vercel.com/dashboard
- **GitHub Commits**: https://github.com/globalswaryoga-ai/swaryoga.com-db/commits/main
- **Instance ID**: `i-0d2fb8b38cb190ffe`
- **Public IP**: `3.109.154.61`

---

**Last Updated**: 2025-01-13 05:04 UTC  
**Bridge Status**: 🟢 ONLINE  
**Vercel Status**: 🔄 DEPLOYING  

