# Vercel Production Deployment Guide

## 🚀 Deployment to Vercel Production (December 19, 2025)

### Current Status
- **Project**: swar-yoga-web (Next.js 14)
- **Repository**: github.com:globalswaryoga-ai/swaryoga.com-db
- **Branch**: main
- **Latest Commit**: a3af785 - PayU 403 fixes + Notes system

### Pre-Deployment Checklist

✅ Git status: Clean (all changes committed)
✅ Latest commits deployed
✅ Build command: `next build`
✅ Framework: Next.js

### Environment Variables Required (Set in Vercel Dashboard)

```env
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=<32+ character string>
NEXT_PUBLIC_API_URL=https://www.swaryoga.com

# PayU Payment Gateway
PAYU_MERCHANT_KEY=gtKFFx
PAYU_MERCHANT_SALT=eCwWELJIl92doCBOxyXPnaVgQnmrjVi6cn0AWfj7
PAYU_MODE=PRODUCTION

# Supabase (if using)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Optional
NEXT_PUBLIC_DEFAULT_PAYMENT_LINK=https://u.payu.in/HIfbfDWJVZqa
```

### Step 1: Verify All Commits Are Pushed

```bash
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan
git status  # Should show "nothing to commit, working tree clean"
git log --oneline -5  # Verify commits
git push origin main  # Ensure latest push
```

### Step 2: Log in to Vercel Dashboard

**URL**: https://vercel.com/globalswaryoga-ai

1. Go to your Swar Yoga project
2. Click on "Settings" → "Environment Variables"
3. Verify all required variables are set

### Step 3: Manual Production Deployment

**Option A: Auto-Deploy (Recommended)**
- Push to `main` branch → Vercel auto-deploys
- Status updates in GitHub → Deployments

**Option B: Manual Deploy from Vercel Dashboard**
1. Go to your project
2. Click "Deploy"
3. Select branch: `main`
4. Click "Deploy"

**Option C: Via Vercel CLI**
```bash
npm i -g vercel
vercel login  # Enter credentials
vercel --prod  # Deploy to production
```

### Step 4: Monitor Deployment

**Dashboard**: https://vercel.com/globalswaryoga-ai/swar-yoga-web-mohan

**Deployment Steps:**
1. ⏳ Build phase (2-3 min): Runs `next build`
2. ⏳ Analysis phase: Checks for issues
3. ✅ Success: Deployed to production

**Check Deployment Status:**
```bash
# View Vercel project status
vercel projects list

# Check deployment logs
vercel logs --prod
```

### Step 5: Verify Production Deployment

**Production URL**: https://www.swaryoga.com

**Verification Checklist:**
- [ ] Main page loads
- [ ] Life planner dashboard accessible
- [ ] Notes page works (/life-planner/dashboard/notes)
- [ ] Payment system functioning
- [ ] No console errors

```bash
# Test API endpoint
curl https://www.swaryoga.com/api/health

# Check deployed version
curl https://www.swaryoga.com/api/version
```

### What's Being Deployed

#### Latest Features
1. **📝 Notes System** (NEW)
   - Graphology-inspired fonts
   - Color psychology themes (10 options)
   - Mood tracking
   - Vision/Goal/Task linking
   - Search and filtering

2. **🔧 PayU 403 Fixes**
   - Phone number validation
   - Enhanced error logging
   - Diagnostic tools
   - Better hash generation

3. **📅 Previous Updates**
   - Daily planner redesign (6 cards)
   - Enhanced calendar with symbols
   - Vision download/PDF export

### Rollback (If Needed)

If production deployment fails:

```bash
# View previous deployments
vercel deployments --prod

# Rollback to previous
vercel deployments --prod | head -5  # Find stable commit
vercel promote <deployment-id> --prod  # Restore previous
```

Or in Vercel Dashboard:
1. Go to "Deployments"
2. Find previous stable version
3. Click "..." → "Promote to Production"

### Performance Monitoring

**Vercel Analytics**: https://vercel.com/globalswaryoga-ai/swar-yoga-web-mohan/analytics

Monitor:
- Page load times
- API response times
- Error rates
- Deployment frequency

### Common Issues & Solutions

**Issue**: Build fails with "Print not exported"
**Solution**: This is a pre-existing issue on vision-download page. Not related to new features. Can be fixed separately.

**Issue**: PayU not working in production
**Solution**: Ensure `PAYU_MODE=PRODUCTION` is set. Verify Merchant Key/Salt match account.

**Issue**: Notes page shows 401 error
**Solution**: User must be logged in. JWT token must be valid.

### Deployment Notifications

**Post-Deployment Checks:**
1. ✅ All pages loading
2. ✅ APIs responding
3. ✅ Database connections stable
4. ✅ Third-party services (PayU, etc.) working

### Production URLs

| Service | URL |
|---------|-----|
| Main Site | https://www.swaryoga.com |
| Life Planner | https://www.swaryoga.com/life-planner |
| Notes | https://www.swaryoga.com/life-planner/dashboard/notes |
| Admin | https://www.swaryoga.com/admin |
| API Health | https://www.swaryoga.com/api/health |

### Next Steps

After successful deployment:

1. **Notify users** about new Notes feature
2. **Monitor logs** for errors
3. **Test key flows**: Checkout → Payment → Success
4. **Check analytics** for user activity

### Support

**If deployment fails:**
1. Check build logs in Vercel Dashboard
2. Run local build: `npm run build`
3. Check environment variables
4. Review recent commits for breaking changes

**Vercel Support**: https://vercel.com/support

---

**Deployment Command** (for your reference):
```bash
git push origin main  # Triggers auto-deploy
# OR
vercel --prod  # Manual deploy
```

**Estimated Time**: 3-5 minutes for full deployment

**Last Updated**: December 19, 2025, 2:30 PM IST
