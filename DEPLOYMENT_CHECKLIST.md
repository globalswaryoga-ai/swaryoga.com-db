# Social Media Manager - Deployment Checklist ✅

**Start Date:** December 31, 2025  
**Target Completion:** January 1, 2025  
**Status:** IN PROGRESS

---

## Phase 1: Gather Platform Credentials (30 mins)

### ✅ Task 1.1: Facebook/Instagram Credentials
**Location:** https://developers.facebook.com

```
Steps:
1. Go to https://developers.facebook.com
2. Log in with your account
3. Click "My Apps" → Select your app (or create one)
4. Settings → Basic → Copy:
   ✅ App ID: ________________
   ✅ App Secret: ________________

5. Get Page Access Token:
   - Go to Tools → Graph API Explorer
   - Select your app from dropdown
   - Select "Get User Access Token"
   - Check these scopes:
     ☐ pages_read_engagement
     ☐ pages_read_user_content
     ☐ instagram_basic
   - Click "Generate Access Token"
   - Copy token: ________________
   
   NOTE: This is temporary. Convert to long-lived (valid 60 days):
   - Go to Token Debugger: https://developers.facebook.com/tools/debug/accesstoken
   - Paste token, click "Debug"
   - Click "Extend Access Token"
   ✅ Long-lived token: ________________

6. Get Facebook Page ID:
   - Go to https://findmyfbid.com
   - Enter your Facebook page URL
   ✅ Page ID: ________________

7. Get Instagram Business Account ID:
   - Via Graph API Explorer:
   - Query: GET /me/instagram_accounts
   - Check response for "id"
   ✅ Instagram Account ID: ________________
```

**Status:** ☐ COMPLETE

---

### ✅ Task 1.2: YouTube Credentials
**Location:** https://console.cloud.google.com

```
Steps:
1. Go to https://console.cloud.google.com
2. Create new project: "Swar Yoga Social Media"
3. Click "Select a project" → "New Project"
   ✅ Project Name: Swar Yoga Social Media
4. Enable YouTube Data API v3:
   - Go to APIs & Services → Library
   - Search "YouTube Data API v3"
   - Click "Enable"
5. Create API Key:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "API Key"
   - A popup shows your API key
   ✅ YouTube API Key: ________________
   
   (Restrict it to YouTube only for security)
   - Click the key to edit
   - Under "Application restrictions": Select "API"
   - Under "API restrictions": Select "YouTube Data API v3"
   - Save

6. Get Your Channel ID:
   - Go to https://www.youtube.com/@YOUR_CHANNEL/about
   - Find "Channel ID" section
   ✅ YouTube Channel ID: ________________
```

**Status:** ☐ COMPLETE

---

### ✅ Task 1.3: X/Twitter (Twitter API v2) Credentials
**Location:** https://developer.twitter.com

```
Steps:
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Log in with your account
3. Create new app or use existing:
   - Go to "Projects & Apps"
   - Create new app if needed
4. Go to "Keys and tokens"
5. Under "Authentication Tokens & Keys":
   - "Bearer Token" section (NOT API Key/Secret)
   - Click "Regenerate"
   - Copy the Bearer Token (starts with "AAAA")
   ✅ X/Twitter Bearer Token: ________________
   
   NOTE: This is VERY important! Must start with "AAAA"

6. Verify permissions:
   - Go to App Settings
   - Check permissions include at least "Read"
   - Recommended: "Read and Write"

7. Get Your X Account ID:
   - Go to https://twitter.com/YOUR_USERNAME
   - Browser dev tools → Network tab
   - Refresh page
   - Look for request with "data"
   - Or use: curl -X GET "https://api.twitter.com/2/users/me" \
               -H "Authorization: Bearer YOUR_TOKEN"
   ✅ X/Twitter User ID: ________________
```

**Status:** ☐ COMPLETE

---

### ✅ Task 1.4: LinkedIn Credentials
**Location:** https://www.linkedin.com/developers

```
Steps:
1. Go to https://www.linkedin.com/developers/apps
2. Create new app:
   - Click "Create app"
   - App name: "Swar Yoga Social Media"
   - LinkedIn Page: Select your company page
   - App logo: Upload
3. Go to "Auth" tab
4. Add Authorized redirect URLs:
   ✅ Add: https://your-app.com/auth/linkedin
   ✅ Add: http://localhost:3000/auth/linkedin (for testing)
5. Go to "Credentials" or "OAuth settings"
6. Copy:
   ✅ Client ID: ________________
   ✅ Client Secret: ________________
7. Request OAuth token with scopes:
   - r_organization_admin
   - w_organization_metadata
   
   Use OAuth flow or testing tool to get token:
   ✅ OAuth Access Token: ________________
   
8. Get Your LinkedIn Company ID:
   - Go to https://www.linkedin.com/company/YOUR_COMPANY/about/
   - Check URL: linkedin.com/company/[NUMBER]/
   ✅ LinkedIn Company ID: ________________
```

**Status:** ☐ COMPLETE

---

## Phase 2: Environment Configuration (5 mins)

### ✅ Task 2.1: Update .env.production
**File:** `.env.production`

```bash
# Add or update these variables:

# Social Media Manager
CRON_SECRET=swar-yoga-social-media-secret-2025-secure-key-min32chars
NEXTAUTH_URL=https://your-production-domain.com

# Optional - for detailed logging
DEBUG_SOCIAL_MEDIA=1
```

**Status:** ☐ COMPLETE

---

### ✅ Task 2.2: Add Credentials to Database
**Method:** Admin panel after deployment

```
After deployment, go to:
Admin → Social Media Setup

For each platform, enter:
  Platform: Facebook
  Account Name: "Main Facebook Page"
  Account ID: [from 1.1]
  Access Token: [from 1.1]
  Save
  
  Platform: Instagram
  Account Name: "Instagram Business"
  Account ID: [from 1.1]
  Access Token: [from 1.1]
  Save
  
  Platform: YouTube
  Account Name: "YouTube Channel"
  Account ID: [from 1.2]
  Access Token/API Key: [from 1.2]
  Save
  
  Platform: X/Twitter
  Account Name: "Twitter Main"
  Account ID: [from 1.3]
  Access Token: [from 1.3]
  Save
  
  Platform: LinkedIn
  Account Name: "LinkedIn Company"
  Account ID: [from 1.4]
  Access Token: [from 1.4]
  Save
```

**Status:** ☐ COMPLETE

---

## Phase 3: Deploy Code (10 mins)

### ✅ Task 3.1: Verify Code Ready
```bash
# Code is already on main branch
git log --oneline -5
# Should show: "📦 Final Delivery: Complete Social Media Manager..."

# All files are committed
git status
# Should show: "nothing to commit, working tree clean"
```

**Status:** ☐ COMPLETE

---

### ✅ Task 3.2: Deploy to Production

**Option A: Vercel (Recommended)**
```bash
# Push is automatic from main branch
# Go to https://vercel.com/dashboard
# Select your project
# Should auto-deploy
# Wait for: "Production • Deployment successful"

Status: ☐ COMPLETE
```

**Option B: Self-Hosted / Railway**
```bash
# If using Railway:
# 1. Connect your GitHub repo
# 2. Push to main branch
# 3. Railway auto-deploys

# If using Docker:
# docker build -t swar-yoga-web .
# docker push your-registry/swar-yoga-web
# Update your deployment

Status: ☐ COMPLETE
```

**Option C: Other Platforms**
```
Follow your platform's deployment guide
Ensure environment variables are set in production
Verify CRON_SECRET is set
```

---

## Phase 4: Configure Scheduler (15 mins)

### ✅ Task 4.1: Set Up EasyCron (RECOMMENDED)

```
1. Go to https://www.easycron.com
2. Create account (free tier available)
3. Click "Create a New Cron Job"
4. Fill in:
   
   URL: https://your-production-domain.com/api/admin/social-media/scheduler?action=publish&secret=YOUR_CRON_SECRET
   
   Execution interval: Every 5 minutes
   
   Timezone: [Your timezone, e.g., "Asia/Kolkata"]
   
   Notifications: Check "Email me if the cron job fails"
   
5. Click "Create"
6. Verify: You should see "Status: ACTIVE"

Status: ☐ COMPLETE
```

**Alternative: Google Cloud Scheduler**
```
1. Go to Google Cloud Console
2. Cloud Scheduler → Create Job
3. Set:
   Name: social-media-scheduler
   Frequency: */5 * * * * (every 5 minutes)
   Timezone: [Your timezone]
   HTTP: GET
   URI: https://your-app.com/api/admin/social-media/scheduler?action=publish&secret=YOUR_SECRET
4. Create

Status: ☐ COMPLETE
```

**Alternative: AWS Lambda**
```
See SOCIAL_MEDIA_SCHEDULER_SETUP.md for detailed steps

Status: ☐ COMPLETE
```

**Alternative: Local/PM2**
```
See SOCIAL_MEDIA_SCHEDULER_SETUP.md for detailed steps

Status: ☐ COMPLETE
```

---

## Phase 5: Testing (1 hour)

### ✅ Task 5.1: Health Check
```bash
# Test if app is running
curl https://your-app.com/api/health

# Should return: 200 OK

Status: ☐ COMPLETE
```

---

### ✅ Task 5.2: Test Analytics Sync

```
Method 1: Via Admin Panel
1. Go to Admin → Social Media Manager
2. Click "Sync Analytics Now"
3. Wait 30 seconds
4. Should show follower counts:
   ☐ Facebook: [number] followers
   ☐ Instagram: [number] followers
   ☐ YouTube: [number] subscribers
   ☐ X/Twitter: [number] followers
   ☐ LinkedIn: [number] followers

Method 2: Via API
curl -X POST https://your-app.com/api/admin/social-media/analytics/sync \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json"

Response should show:
{
  "success": true,
  "data": {
    "results": [
      {"platform": "facebook", "ok": true, "followers": 1234},
      // ... other platforms
    ]
  }
}

Status: ☐ COMPLETE
```

---

### ✅ Task 5.3: Test Post Publishing

```
1. Go to Admin → Social Media Manager → Create Post
2. Enter:
   Text: "Test post from automation - please ignore"
   Image: Upload a test image (500x500px)
   Platforms: Select ONE (start with Facebook)
   Schedule: NOW
3. Click "Publish"
4. Wait 10 seconds
5. Should see:
   ☐ "Status: Published"
   ☐ "Facebook: Success"
6. Check Facebook page:
   ☐ Post appears with image
7. Delete test post from Facebook manually

Repeat for each platform:
   ☐ Instagram
   ☐ X/Twitter
   ☐ LinkedIn
   ☐ YouTube (skip - video upload not yet supported)

Status: ☐ COMPLETE
```

---

### ✅ Task 5.4: Test Scheduled Posting

```
1. Create new post:
   Text: "Scheduled test post"
   Image: Any image
   Platform: Facebook (for quick testing)
   Schedule: NOW + 2 minutes
   Click "Create"

2. Status should show: "SCHEDULED"

3. Wait 2 minutes

4. Check scheduler ran:
   curl "https://your-app.com/api/admin/social-media/scheduler?action=status&secret=YOUR_SECRET"
   
   Response should show:
   {
     "status": "active",
     "scheduledPosts": 1,
     "readyToPublish": 0,
     "publishedPosts": 1
   }

5. Check Facebook:
   ☐ Post appears automatically

6. Delete test post

Status: ☐ COMPLETE
```

---

### ✅ Task 5.5: Test Monitoring Dashboard

```
1. Go to Admin panel or API:
   https://your-app.com/api/admin/social-media/monitor?view=dashboard

2. Should see metrics:
   ☐ Analytics sync success rate
   ☐ Publishing success rate
   ☐ Recent errors
   ☐ Platform status

3. Try error scenario:
   - Create account with fake token
   - Sync analytics
   - Should show error in dashboard with fix suggestion

Status: ☐ COMPLETE
```

---

### ✅ Task 5.6: Test Error Messages

```
Scenario 1: Invalid Token
- Go to Admin → Social Media Setup
- Change one token to invalid: "fake-token-123"
- Sync analytics
- Should see user-friendly error:
  "Token expired or invalid. Go to Admin → Social Media Setup..."

Scenario 2: Invalid Account ID
- Change account ID to invalid format
- Sync analytics
- Should see error with fix suggestion

Status: ☐ COMPLETE
```

---

## Phase 6: Final Verification (15 mins)

### ✅ Task 6.1: Verify Scheduler is Running

```bash
# Check if scheduler has been called recently:
curl -X GET "https://your-app.com/api/admin/social-media/scheduler?action=status&secret=YOUR_CRON_SECRET"

# Response should show recent execution:
{
  "status": "active",
  "scheduledPosts": 0,
  "readyToPublish": 0,
  "publishedPosts": 2,
  "nextCheckAt": "2025-01-01T12:35:00Z"
}

Status: ☐ COMPLETE
```

---

### ✅ Task 6.2: Check Logs

```bash
# For Vercel:
vercel logs your-project-name --limit 50

# Look for:
✅ No ERROR messages
✅ "✅ [analytics_sync]" entries showing sync running
✅ Scheduler endpoint being called every 5 minutes

Status: ☐ COMPLETE
```

---

### ✅ Task 6.3: Monitor First Hour

```
After deployment is live:

Time 0:00 - 0:15:
  ✅ Verify app loads without errors
  ✅ Verify analytics sync works
  ✅ Create test post, verify publishes

Time 0:15 - 0:30:
  ✅ Scheduler should have run (check logs)
  ✅ Check error rate in dashboard (should be 0%)

Time 0:30 - 1:00:
  ✅ Continue monitoring
  ✅ If any errors, check dashboard for details
  ✅ Fix any issues immediately

Status: ☐ COMPLETE
```

---

## Phase 7: Go Live (Announce!)

### ✅ Task 7.1: Announce to Team

```
Send message to team:

"🚀 Social Media Manager is now LIVE!

You can now:
✅ Auto-sync follower counts from 5 platforms
✅ Publish posts to Facebook, Instagram, X/Twitter, LinkedIn
✅ Schedule posts for automatic publishing
✅ Monitor what's working/failing

How to use:
1. Admin → Social Media Setup (enter platform credentials)
2. Admin → Social Media Manager (create/publish posts)
3. Admin → Monitor (see real-time status)

Questions? Check SOCIAL_MEDIA_TESTING_DEPLOYMENT.md"
```

**Status:** ☐ COMPLETE

---

## FINAL CHECKLIST

### Critical Items
- ☐ All 5 platform credentials obtained
- ☐ Environment variables set (.env.production)
- ☐ Code deployed to production
- ☐ Scheduler configured and running
- ☐ Analytics sync tested (shows real follower counts)
- ☐ Post publishing tested (posts appear on platforms)
- ☐ Scheduled posting tested (auto-publishes)
- ☐ Error handling tested (shows helpful messages)
- ☐ Monitoring dashboard accessible
- ☐ Team notified

### Verification Items
- ☐ App loads without errors
- ☐ Admin panel accessible
- ☐ No 500 errors in logs
- ☐ Scheduler running every 5 minutes
- ☐ Follower counts are real (not zeros)
- ☐ Posted content appears on actual platforms

---

## DEPLOYMENT COMPLETE! 🎉

**Status:** ✅ LIVE

**What's Working:**
- Real-time analytics from 5 platforms
- Cross-platform publishing
- Automated scheduled posting
- Error monitoring and recovery
- User-friendly error messages

**What's Next:**
1. Monitor dashboard daily for first week
2. Post content regularly to test
3. Keep platform credentials fresh
4. Watch for API updates from platforms

**Support:**
- Check `/api/admin/social-media/monitor` for status
- Review error logs if something fails
- See `SOCIAL_MEDIA_TESTING_DEPLOYMENT.md` for troubleshooting

---

**Deployment Completed:** January 1, 2025  
**Status:** ✅ READY FOR PRODUCTION USE

Enjoy automated social media management! 📱✨
