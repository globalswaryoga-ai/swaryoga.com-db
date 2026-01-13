# Deployment Action Items - January 13, 2025

## 🚀 Frontend Deployment (Vercel)

### Status: ✅ READY
- [x] All code committed to `main` branch
- [x] Build passes without errors
- [x] Ready for auto-deployment

### Action Required: NONE
- Vercel should automatically deploy on push to main
- Check deployment status at: https://vercel.com/globalswaryoga-ai/swaryoga-com-db
- Estimated deployment time: 2-3 minutes

---

## 🔧 Bridge Deployment (EC2)

### Status: ⏳ PENDING
- [x] Code committed to `main` branch
- [ ] SSH connection needs to be re-established
- [ ] Dependencies need to be installed
- [ ] PM2 process needs to be restarted

### Action Required: MANUAL

**Step 1: SSH into EC2**
```bash
ssh -i ~/.ssh/swar-yoga-bridge-key.pem ec2-user@3.109.154.61
```

**Step 2: Update Code**
```bash
cd /home/ec2-user/swaryoga.com-db
git pull origin main
```

**Step 3: Install Dependencies**
```bash
cd deploy/wa-bridge
npm install
```

**Step 4: Restart PM2**
```bash
pm2 restart whatsapp-bridge
pm2 status
pm2 logs whatsapp-bridge --lines 20
```

**Step 5: Verify Service**
```bash
curl -s http://localhost:3333/status | jq .
```

Expected output:
```json
{
  "status": "connected",
  "sessionReady": true,
  "chatCount": 14
}
```

---

## 🔐 AWS S3 Configuration (EC2)

### Status: ⏳ PENDING
- [ ] AWS credentials configured on EC2
- [ ] S3 bucket created (or existing)
- [ ] Environment variables set in PM2

### Action Required: MANUAL

**Step 1: Create S3 Bucket (if not exists)**
```bash
aws s3 mb s3://swar-yoga-media --region ap-south-1
```

**Step 2: Configure Environment on EC2**
```bash
# SSH into EC2 and add to ecosystem.config.js:
nano ecosystem.config.js
```

Add these environment variables:
```javascript
env: {
  AWS_ACCESS_KEY_ID: 'your-key-here',
  AWS_SECRET_ACCESS_KEY: 'your-secret-here',
  AWS_S3_BUCKET: 'swar-yoga-media',
  AWS_REGION: 'ap-south-1',
  ...
}
```

**Step 3: Restart PM2 with New Config**
```bash
pm2 delete whatsapp-bridge
pm2 start ecosystem.config.js
```

---

## ✅ Testing Checklist

After deployment, verify all features:

### Frontend Tests (Vercel)
- [ ] Navigate to `/admin/crm/qr`
- [ ] Message input textarea shows 8 rows
- [ ] Message bubbles display in larger font (text-base)
- [ ] +Lead button is lavender colored
- [ ] Font looks professional (Inter/Segoe UI)

### Lead Creation Tests
- [ ] Click "+ Lead" button
- [ ] Fill in name, phone, email
- [ ] Submit form
- [ ] Verify in sidebar: shows name on line 1, phone on line 2
- [ ] Verify in header: shows ID tag and status tag
- [ ] Verify header shows both name and phone number

### Message Tests
- [ ] Select a chat
- [ ] Type a multi-line message in 8-row textarea
- [ ] Send message successfully
- [ ] Message appears with correct formatting

### Media Upload Tests
- [ ] Click attachment button "+"
- [ ] Upload an image
- [ ] Check browser console for logs
- [ ] If S3 not configured: see helpful error message
- [ ] If S3 configured: image should upload and send

### Bridge Endpoint Tests
```bash
# On EC2 or from local machine (if port 3333 exposed):
curl -H "x-bridge-secret: swar-bridge-secret-2024" http://3.109.154.61:3333/status

curl -H "x-bridge-secret: swar-bridge-secret-2024" http://3.109.154.61:3333/chats | jq .chats | head -5

curl -X POST \
  -H "x-bridge-secret: swar-bridge-secret-2024" \
  -F "file=@/tmp/test.jpg" \
  http://3.109.154.61:3333/media/upload | jq .
```

---

## 📊 Verification Steps

### After Frontend Deploy
```bash
# Check deployment logs in Vercel dashboard
# Verify URL works: https://[your-domain]/admin/crm/qr

# From browser dev tools, check:
# 1. Network tab: All resources load (no 404s)
# 2. Console: No errors or warnings
# 3. UI: All changes visible (textarea, fonts, button color)
```

### After Bridge Deploy
```bash
# On EC2:
pm2 logs whatsapp-bridge --lines 30

# Verify key logs appear:
# ✓ WhatsApp client ready
# ✓ Loaded N chats
# ✓ Media/upload endpoint started

# Test endpoints from EC2:
curl http://localhost:3333/status
curl http://localhost:3333/health
```

---

## 🆘 Troubleshooting

### Frontend Issues

**Issue: Styles not updating**
- Clear browser cache (Cmd+Shift+Delete)
- Hard refresh (Cmd+Shift+R)
- Check Vercel deployment status

**Issue: Message input not showing as textarea**
- Check build logs in Vercel
- Verify file was edited correctly
- Clear node_modules and rebuild locally

### Bridge Issues

**Issue: PM2 restart fails**
```bash
# Check current status
pm2 status

# View error logs
pm2 logs whatsapp-bridge --err

# Delete and restart
pm2 delete whatsapp-bridge
cd /home/ec2-user/swaryoga.com-db/deploy/wa-bridge
node server.js  # Test directly first
```

**Issue: Media upload returns 503 "S3 upload not configured"**
- Verify AWS credentials in PM2: `pm2 show whatsapp-bridge`
- Check environment variables are set
- Test S3 access: `aws s3 ls`

---

## 📋 Deployment Timeline

| Step | Component | Time | Status |
|------|-----------|------|--------|
| 1 | Code commits | ✅ Done | Complete |
| 2 | Frontend build | ✅ Done | Complete |
| 3 | Vercel auto-deploy | ⏳ Pending | ~2-3 min |
| 4 | SSH to EC2 | ⏳ Pending | Manual |
| 5 | Pull code | ⏳ Pending | ~1 min |
| 6 | npm install | ⏳ Pending | ~2-3 min |
| 7 | PM2 restart | ⏳ Pending | ~10 sec |
| 8 | Verify tests | ⏳ Pending | ~5 min |

**Total manual deployment time: ~10-15 minutes**

---

## 📞 Support

If any step fails:
1. Check error messages in logs
2. Refer to `UI_UX_IMPROVEMENTS_SUMMARY.md` for details
3. Refer to `S3_CONFIGURATION_GUIDE.md` for S3 issues
4. Check bridge logs: `pm2 logs whatsapp-bridge`
5. Check Next.js build: `npm run build`

---

## ✨ What Changed

**Frontend** (`app/admin/crm/qr/page.tsx`):
- Textarea rows increased to 8
- Font size increased (text-base)
- Professional font family added
- +Lead button color changed to lavender
- New lead creation improved
- Sidebar shows name + phone number

**Bridge** (`deploy/wa-bridge/`):
- Added multer dependency
- Added `/media/upload` endpoint
- S3 credential validation
- Better error reporting

**Documentation**:
- Added comprehensive summary
- Added S3 configuration guide
- Added this deployment guide

---

**Questions? Everything is documented in:**
- `UI_UX_IMPROVEMENTS_SUMMARY.md` - Complete overview
- `S3_CONFIGURATION_GUIDE.md` - AWS setup instructions
- Git commits on `main` branch - Individual changes

**Next Steps:**
1. ✅ All code committed to GitHub
2. ⏳ Monitor Vercel deployment
3. ⏳ SSH to EC2 and deploy bridge
4. ⏳ Configure S3 credentials
5. ✅ Test end-to-end

---

**Happy Deploying!** 🚀
