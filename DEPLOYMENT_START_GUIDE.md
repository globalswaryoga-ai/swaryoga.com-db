# 🚀 Social Media Manager - Deployment Start Guide

## Quick Overview

**What's Ready:** Full Social Media Manager system (analytics, publishing, scheduling)  
**Status:** Code deployed to production, waiting for platform credentials  
**Time to Live:** 30 mins - 2 hours (depending on how fast you gather credentials)

---

## ⚡ Express Deployment (30 mins - Minimal Setup)

**Perfect if:** You want to test quickly with one platform

### Step 1: Get Facebook Credentials (10 mins)

```
1. Go to: https://developers.facebook.com
2. Login
3. Click "My Apps" → Your App
4. Settings → Basic
5. Copy:
   ✅ APP ID: _______________
   ✅ APP SECRET: _______________

6. Get Token:
   - Tools → Graph API Explorer
   - Select your app
   - Get User Access Token
   - Select scopes: pages_read_engagement, pages_read_user_content
   - Copy token: _______________

7. Get Page ID:
   - Go to https://findmyfbid.com
   - Enter your page URL
   - Copy ID: _______________
```

### Step 2: Deploy Code (2 mins)

```
# Already on main branch, auto-deployed
# Vercel: Check dashboard, should show ✅ Production deployment successful
```

### Step 3: Set Environment Variable (2 mins)

```
Add to production environment variables:
CRON_SECRET=your-random-secret-string-here

Set in: Vercel Dashboard → Settings → Environment Variables
Or: Your hosting provider's env config
```

### Step 4: Add Credentials (5 mins)

```
1. Go to: your-app.com/admin/social-media-setup
2. Add Facebook account:
   Platform: Facebook
   Account ID: [from step 1.7]
   Access Token: [from step 1.6]
   Save
```

### Step 5: Test (5 mins)

```
1. Go to: your-app.com/admin/social-media-manager
2. Click "Sync Now"
3. Should show follower count (not zero) ✅
4. Create test post
5. Click Publish
6. Check Facebook page - post should appear ✅
```

### Done! ✅

You now have:
- Real follower counts from Facebook
- One-click publishing to Facebook
- Posts auto-publish when scheduled

---

## 📋 Full Deployment (2-3 hours - All Platforms)

**Perfect if:** You want everything working with all 5 platforms

Follow the detailed **DEPLOYMENT_CHECKLIST.md** file:

1. **Gather all 5 platform credentials** (1 hour)
   - Facebook/Instagram
   - YouTube
   - X/Twitter
   - LinkedIn

2. **Deploy to production** (10 mins)

3. **Configure scheduler** (15 mins)

4. **Test everything** (1 hour)

5. **Go live!** (5 mins)

---

## 🔐 Security Notes

### Keep These Secret:
- App secrets
- API keys
- Access tokens
- CRON_SECRET

**Never:** Share these in messages, commits, or public channels

**Where to store:** 
- Vercel → Environment Variables (encrypted)
- Your hosting provider's secret manager
- `.env.production` (not in git)

### Token Refresh:
- Facebook tokens expire in 60 days → refresh before expiry
- YouTube keys don't expire
- X/Twitter tokens don't expire
- LinkedIn tokens expire in 6 months

---

## 📱 What You Can Do After Deployment

### Immediately (No setup):
- ✅ View real follower counts
- ✅ Publish posts to platforms
- ✅ Schedule posts for later
- ✅ Monitor status and errors

### After credential setup:
- ✅ Works for all 5 platforms
- ✅ Auto-publishes scheduled posts
- ✅ Retries failed posts
- ✅ Shows helpful error messages

---

## 🛠️ If Something Goes Wrong

### Problem: "404 - Page not found"
**Fix:** Check if code deployed successfully
```
vercel logs your-project-name
# Should show no errors
```

### Problem: Followers still showing 0
**Fix:** Credentials not set or invalid
```
1. Check Admin → Social Media Setup
2. Verify token is correct
3. Verify account ID is correct
4. Try syncing again
```

### Problem: Post doesn't publish
**Fix:** Check error message
```
1. Go to Admin → Monitor
2. See what platform failed
3. Error message tells you why
4. Fix the issue
5. Retry
```

### Problem: Scheduler not running
**Fix:** Check cron service
```
1. Verify CRON_SECRET is set in production
2. Check EasyCron/scheduler dashboard
3. Verify it's calling your endpoint
4. Check app logs for any errors
```

---

## 📞 Support Resources

| Issue | Resource |
|-------|----------|
| Setup help | DEPLOYMENT_CHECKLIST.md |
| Testing guide | SOCIAL_MEDIA_TESTING_DEPLOYMENT.md |
| Scheduler setup | SOCIAL_MEDIA_SCHEDULER_SETUP.md |
| What's working | SOCIAL_MEDIA_IMPLEMENTATION_COMPLETE.md |
| Full details | FINAL_DELIVERY_SUMMARY.md |

---

## ✅ Checklist to Start

- [ ] You're ready to gather platform credentials
- [ ] You have admin access to all platforms
- [ ] You have hosting environment ready (Vercel/Railway/etc)
- [ ] You know your production domain name

**If all checked:** You're ready to start! 🚀

---

## 🎯 Recommended Path

**Today (New Year's Eve):**
1. Get Facebook credentials (easiest, 10 mins)
2. Deploy code (already done, 2 mins)
3. Test with Facebook (15 mins)
4. **LIVE WITH FACEBOOK!** 🎉

**This Week:**
1. Get YouTube credentials
2. Get X/Twitter credentials
3. Get LinkedIn credentials
4. Configure scheduler
5. **FULLY LIVE WITH ALL PLATFORMS!** 🎊

---

## Quick Command Reference

```bash
# Check if deployed
curl https://your-app.com/health

# Sync analytics
curl -X POST https://your-app.com/api/admin/social-media/analytics/sync \
  -H "Authorization: Bearer YOUR_JWT"

# Publish post
curl -X POST https://your-app.com/api/admin/social-media/posts/[ID]/publish \
  -H "Authorization: Bearer YOUR_JWT"

# Check scheduler status
curl "https://your-app.com/api/admin/social-media/scheduler?action=status&secret=YOUR_SECRET"

# View monitoring dashboard
# https://your-app.com/api/admin/social-media/monitor?view=dashboard
```

---

## 🎉 Ready to Go!

**Everything is ready. Just need:**
1. Platform credentials (keys, tokens, IDs)
2. 30 mins - 2 hours of your time
3. BOOM! Live! 🚀

**Start with DEPLOYMENT_CHECKLIST.md and follow the steps!**

Questions? Every file has detailed instructions.

Let's go! 💪
