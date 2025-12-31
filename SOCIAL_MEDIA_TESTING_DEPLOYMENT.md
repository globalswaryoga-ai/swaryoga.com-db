# Social Media Manager - Testing & Deployment Guide

## Quick Start Testing Checklist

### 1. Pre-Deployment Test Environment Setup

Before testing, ensure you have:
- ✅ All platform API credentials ready (Facebook, Instagram, YouTube, X/Twitter, LinkedIn)
- ✅ Test accounts created on each platform
- ✅ `.env.local` properly configured with test credentials
- ✅ MongoDB test database connection verified
- ✅ Development server running: `npm run dev`

### 2. Platform Credential Testing

#### Facebook & Instagram
```bash
# Test credentials setup
1. Go to https://developers.facebook.com/apps
2. Select your app
3. Settings → Basic → Copy App ID and Secret
4. Tools → Graph API Explorer
5. Get User Access Token with scopes:
   - pages_read_engagement
   - pages_read_user_content
   - instagram_basic
6. Convert to long-lived token (valid for 60 days)

# Verify token works:
curl -X GET "https://graph.facebook.com/me?access_token=YOUR_TOKEN"
# Should return your Facebook ID
```

#### YouTube
```bash
# Test API key setup
1. Go to https://console.cloud.google.com
2. Create new project: "Swar Yoga Test"
3. Enable "YouTube Data API v3"
4. Create API Key (Restrict to YouTube Data API)
5. Create OAuth 2.0 credentials if testing with OAuth

# Verify API key works:
curl "https://www.googleapis.com/youtube/v3/channels?part=statistics&id=YOUR_CHANNEL_ID&key=YOUR_API_KEY"
# Should return channel statistics
```

#### X/Twitter
```bash
# Test API v2 setup
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create new app or use existing
3. Keys and Tokens → Generate Bearer Token
4. Token should start with "AAAA"
5. Ensure API has at least "Read" permissions

# Verify bearer token works:
curl -X GET "https://api.twitter.com/2/users/me" \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN"
# Should return your Twitter user info
```

#### LinkedIn
```bash
# Test API setup
1. Go to https://www.linkedin.com/developers/apps
2. Create new app
3. Auth → Authorized redirect URLs (add your app URL)
4. Generate new token with scopes:
   - r_organization_admin
   - w_organization_metadata

# Verify token works:
curl -X GET "https://api.linkedin.com/v2/me" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

### 3. Local Testing Workflow

#### Test 1: Analytics Sync (Read-Only)

```bash
# 1. Create test social media account in admin
# Go to Admin → Social Media Setup
# Add test account for each platform with test credentials

# 2. Test analytics sync endpoint
curl -X POST http://localhost:3000/api/admin/social-media/analytics/sync \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json"

# Expected response:
{
  "success": true,
  "data": {
    "results": [
      {
        "accountMongoId": "...",
        "platform": "facebook",
        "accountId": "123456",
        "ok": true,
        "followers": 1500
      },
      // ... other platforms
    ],
    "syncedAt": "2024-01-01T12:00:00Z"
  }
}

# 3. Verify UI shows updated follower counts
# Go to Admin → Social Media Manager → Dashboard
# Should see correct follower counts for each platform
```

#### Test 2: Post Publishing (Write Operation)

```bash
# 1. Create test post via Admin UI
# Go to Admin → Social Media Manager → Create Post
# Set:
#   - Text: "Test post from automation - ignore"
#   - Add test image (500x500px minimum)
#   - Select all platforms
#   - Don't schedule (publish immediately)
#   - Click "Publish"

# 2. Monitor the publish response
# Should show success for all platforms
{
  "success": true,
  "data": {
    "postId": "...",
    "status": "published",
    "results": [
      {
        "platform": "facebook",
        "ok": true,
        "platformPostId": "123456_7890"
      },
      // ... other platforms
    ]
  }
}

# 3. Verify posts appear on actual platforms
# - Check Facebook page timeline
# - Check Instagram business account feed
# - Check YouTube community section (if enabled)
# - Check X/Twitter feed
# - Check LinkedIn company page feed

# 4. Delete test posts from platforms
# (Posts can't be deleted via API for some platforms, so delete manually)
```

#### Test 3: Scheduled Publishing

```bash
# 1. Create scheduled post
# Go to Admin → Social Media Manager → Create Post
# Set:
#   - Text: "Scheduled test - should publish in 2 minutes"
#   - Select one platform (Facebook recommended for quick testing)
#   - Schedule for NOW + 2 minutes
#   - Click "Create"

# 2. Verify post status is "scheduled"
# Check MongoDB or admin dashboard

# 3. Trigger scheduler manually
curl -X GET "http://localhost:3000/api/admin/social-media/scheduler?action=publish&secret=YOUR_CRON_SECRET"

# Expected response:
{
  "success": true,
  "message": "Checked 1 posts. Published: 1, Failed: 0",
  "data": {
    "totalChecked": 1,
    "published": 1,
    "failed": 0,
    "errors": []
  }
}

# 4. Verify post appears on Facebook
# Delete test post when done
```

#### Test 4: Error Handling

```bash
# 1. Test invalid token error
# Create account with fake token, try to sync
# Should get friendly error message like:
# "❌ FACEBOOK: Token expired or invalid. Please reconnect..."

# 2. Test invalid account ID
# Create account with wrong format ID
# Should get error about ID format

# 3. Test network error
# Disconnect internet, try to publish
# Should get friendly error about connectivity

# 4. Monitor error logs
curl -X GET "http://localhost:3000/api/admin/social-media/monitor?view=errors" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"

# Should show recent errors with categorization
```

#### Test 5: Rate Limiting

```bash
# 1. Make rapid API calls
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/admin/social-media/analytics/sync \
    -H "Authorization: Bearer YOUR_ADMIN_JWT" &
done
wait

# Should handle concurrent requests gracefully
# (Some may be queued or show rate limit message)
```

### 4. Staging Deployment Testing

#### Pre-Staging Checklist

```bash
# 1. Build verification
npm run build
# Should complete without errors

# 2. Type checking
npm run type-check
# Should pass (ignoring known unrelated errors)

# 3. Linting
npm run lint
# Should pass or have only warnings

# 4. Run tests (if applicable)
npm run test
```

#### Staging Deployment Steps

```bash
# Option A: Vercel (Recommended)
# 1. Push to staging branch
git checkout -b staging
git push origin staging

# 2. Vercel auto-deploys to staging environment
# 3. Check deployment status: https://vercel.com/dashboard

# Option B: Self-hosted / Railway
# 1. Set CRON_SECRET and other env vars in staging
# 2. Deploy: git push origin main (if auto-deploy enabled)
# 3. Run migrations if needed
# 4. Verify deployment: curl https://staging-app.com/health

# Option C: Manual Docker deployment
docker build -t swar-yoga-web:latest .
docker push your-registry/swar-yoga-web:latest
kubectl set image deployment/swar-yoga web=your-registry/swar-yoga-web:latest
```

#### Staging Testing (2 hours)

```bash
# 1. Full smoke test on staging
#    Run same tests as local (Analytics, Publishing, Scheduling, Errors)
#    Use STAGING credentials

# 2. Performance check
curl -w "@curl-format.txt" -o /dev/null -s https://staging-app.com/api/admin/social-media/analytics/sync
# Should respond in <2 seconds

# 3. Database connectivity
# Verify staging database is connected
# Check MongoDB Atlas logs for connection activity

# 4. Error logging verification
# Trigger a test error
# Verify it appears in monitoring dashboard
https://staging-app.com/api/admin/social-media/monitor

# 5. Cron job test
# Trigger scheduler on staging
# Verify scheduled posts publish correctly
```

### 5. Production Deployment

#### Pre-Production Checklist

- ✅ All staging tests passed
- ✅ Credentials migrated from staging to production
- ✅ Database backups created
- ✅ Rollback plan documented
- ✅ Team notified of deployment window
- ✅ Monitoring alerts configured

#### Production Deployment Steps

```bash
# 1. Tag release
git tag -a v1.0.0 -m "Social Media Manager - Initial Release"
git push origin v1.0.0

# 2. Deploy to production
# Vercel: Automatically deploys from main branch
# Self-hosted: Push to main, trigger CI/CD pipeline

# 3. Verify deployment
# Check Vercel/Railway dashboard
# Verify DNS and SSL certificate
# Test health endpoint

# 4. Enable monitoring
# Activate error logging webhooks
# Enable cron job on EasyCron or equivalent
# Set up alerting for errors
```

#### Production Testing (1 hour after deployment)

```bash
# 1. Smoke test
# Verify analytics sync works
# Verify one test post publishes (then delete)

# 2. Monitor error rates
# Check admin dashboard
# Should show 0 errors in first hour

# 3. Check logs
# Verify no unexpected errors in logs
# Confirm scheduler cron job running

# 4. User feedback
# Notify team that feature is live
# Monitor for user-reported issues
```

### 6. Post-Deployment Monitoring

#### Daily Checklist

```bash
# 1. Error count
curl -X GET "https://app.com/api/admin/social-media/monitor?view=errors" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
# Should be <5 errors per day

# 2. Success rate
# Should be >95% for analytics sync
# Should be >90% for publishing (accounting for user errors)

# 3. Cron job status
curl -X GET "https://app.com/api/admin/social-media/scheduler?action=status" \
  -H "x-cron-secret: YOUR_SECRET"
# Should show "active" status

# 4. Check for urgent issues
# Search logs for "CRITICAL" or "ERROR"
# Respond to any platform-specific issues
```

#### Weekly Checklist

```bash
# 1. Review error patterns
# Go to Admin → Monitor → Error Summary
# Look for trending issues

# 2. Test platform updates
# Check if any APIs changed
# Verify endpoints still work

# 3. Review performance metrics
# Check response times
# Monitor database query performance

# 4. User feedback review
# Check support tickets
# Address any reported issues
```

### 7. Rollback Plan

**If critical issues occur:**

```bash
# 1. Immediate rollback
# Option A (Vercel): Revert to previous deployment in dashboard
# Option B (Self-hosted): git revert last-commit && git push

# 2. Disable problematic feature
# Set feature flag to disable social media syncing
# Temporarily disable scheduled posts cron job

# 3. Notify users
# Post update: "Social Media Manager temporarily offline for maintenance"

# 4. Investigate and fix
# Check logs for root cause
# Fix in separate branch
# Re-test thoroughly before re-deploying
```

## Troubleshooting Common Issues

### Issue: "Token Expired" errors after deployment

**Solution:**
1. Refresh all platform tokens in Admin Setup
2. Verify tokens have correct scopes
3. For long-running apps, implement token refresh logic

### Issue: Cron job not triggering

**Solution:**
1. Verify CRON_SECRET matches in environment
2. Check EasyCron/scheduler logs
3. Test manually: `curl ...?action=publish&secret=...`
4. Verify app is accessible from internet

### Issue: High error rate on one platform

**Solution:**
1. Check platform API status page
2. Verify credentials are still valid
3. Check error logs for specific messages
4. Review platform's documentation for API changes

### Issue: Database connection errors

**Solution:**
1. Verify MONGODB_URI is correct
2. Check MongoDB firewall rules
3. Verify IP whitelist includes app server
4. Check database backups are working

## Performance Benchmarks

Expected performance after deployment:

- Analytics sync: <2 seconds per account
- Post publishing: <3 seconds per platform
- Scheduler check: <1 second to check 100 posts
- Error rate: <2% of all operations
- Uptime: >99.9% monthly

## Support & Escalation

For issues during testing/deployment:

1. **Level 1**: Check documentation and logs
2. **Level 2**: Review platform API status pages
3. **Level 3**: Contact platform support (with API error codes)
4. **Level 4**: File GitHub issue with reproducible steps

---

**Deployment Complete!** 🎉

Monitor the dashboard regularly and enjoy automated social media publishing!
