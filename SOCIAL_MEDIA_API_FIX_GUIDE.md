# Social Media API Permission Errors - Fix Guide

## Current Errors Identified

### 1. **Facebook & Instagram - Missing Permissions**
```
Error: (#100) Object does not exist, cannot be loaded due to missing permission...
Missing: 'pages_read_engagement', 'Page Public Content Access', or 'Page Public Metadata Access'
```

**Cause:** Your Facebook/Instagram app hasn't been granted the required permissions for accessing page analytics.

**Solution:**
1. Go to [Facebook App Dashboard](https://developers.facebook.com/apps/)
2. Select your app
3. Go to **Settings → Basic** → Copy your App ID and App Secret
4. Go to **Roles → Administrators** → Add your personal account as Admin/Developer
5. Go to **Permissions** section and request:
   - `pages_read_engagement` - For reading page metrics
   - `pages_read_user_content` - For reading posts/content
   - Add **Page Public Content Access** feature in review
   - Add **Page Public Metadata Access** feature in review
6. Submit for App Review (can take 24-48 hours)
7. Once approved, add new Instagram Business Account connection

---

### 2. **Facebook URL - fan_count Field Issue**
```
Error: Tried accessing nonexisting field (fan_count) on node type (URL)
```

**Cause:** You're using a URL node instead of a Page node. The endpoint expects `/page_id` not a full Facebook URL.

**Solution:**
1. In Social Media Setup, use just the Page ID (numbers only)
   - ❌ Wrong: `https://www.facebook.com/people/Swar-Yoga-International/61559147565482/`
   - ✅ Correct: `61559147565482`
2. Or use the Page slug:
   - ✅ Correct: `SwarYogaOfficial`

Extract your Page ID:
- Go to [Facebook Page ID Finder](https://findmyfbid.com/)
- Paste your page URL
- Copy the Page ID shown

---

### 3. **YouTube - API Requests Blocked**
```
Error: Requests to youtube.api.v3.V3DataChannelService.List are blocked
```

**Cause:** YouTube API is disabled or quotas exceeded on your project.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/Select your project
3. Enable **YouTube Data API v3**:
   - Search for "YouTube Data API"
   - Click "Enable"
4. Go to **Credentials** → Create "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized JavaScript origins: `https://yourdomain.com`
7. Add authorized redirect URIs: `https://yourdomain.com/api/social/youtube/callback`
8. Copy the Client ID and Secret
9. Store in Vercel Environment Variables:
   - `YOUTUBE_CLIENT_ID`
   - `YOUTUBE_CLIENT_SECRET`

For API Key (simpler, but limited):
1. Go to **Credentials** → Create API Key
2. Restrict to **YouTube Data API v3**
3. Copy the key to:
   - `YOUTUBE_API_KEY` environment variable

---

## Environment Variables Required

Add these to your Vercel deployment:

```env
# Facebook / Instagram
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# YouTube
YOUTUBE_API_KEY=your_api_key
# OR for OAuth:
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret

# Encryption (for storing credentials safely)
ENCRYPTION_KEY=your_32_char_encryption_key
```

---

## Step-by-Step Setup for Each Platform

### Facebook Page Setup
1. Create/verify a Facebook Business Page: https://business.facebook.com/
2. Create a Facebook App: https://developers.facebook.com/apps/
3. Add Facebook Login product
4. In app settings:
   - Set App Roles (add yourself as Admin/Developer)
   - Request permissions: `pages_read_engagement`, `pages_read_user_content`
5. Generate long-lived access token (valid for 60 days)
6. In Swar Yoga admin panel:
   - Platform: Facebook
   - Account ID: Your Page ID (numbers only)
   - Access Token: Your long-lived token
7. Test sync → Should show follower count

### Instagram Business Account Setup
1. Have an Instagram Business Account connected to Facebook Page
2. In Facebook App:
   - Add Instagram Graph API permissions
   - Request `instagram_basic`, `instagram_graph_user_profile`
3. In Swar Yoga admin panel:
   - Platform: Instagram
   - Account ID: Your IG Business Account ID
   - Access Token: Same as Facebook (can share)
4. Test sync → Should show follower count

### YouTube Channel Setup
1. Create YouTube API project: https://console.cloud.google.com/
2. Enable YouTube Data API v3
3. Create API Key or OAuth 2.0 credentials
4. In Swar Yoga admin panel:
   - Platform: YouTube
   - Account ID: Your Channel ID (find at: youtube.com/account)
   - Access Token: Your API Key OR OAuth token
5. Test sync → Should show subscriber count

---

## Testing Permissions

Use these curl commands to test (replace tokens/IDs):

```bash
# Facebook
curl "https://graph.facebook.com/v20.0/YOUR_PAGE_ID?fields=fan_count&access_token=YOUR_TOKEN"

# Instagram
curl "https://graph.facebook.com/v20.0/YOUR_IG_ID?fields=followers_count&access_token=YOUR_TOKEN"

# YouTube
curl "https://www.googleapis.com/youtube/v3/channels?part=statistics&id=YOUR_CHANNEL_ID&key=YOUR_API_KEY"
```

Expected responses should include the requested fields without error #100.

---

## What Happens After Setup

Once all permissions are configured:
1. Click "Sync Analytics" in admin panel
2. System fetches follower counts from each platform
3. Updates stored in database
4. Display on dashboard with last sync time
5. Shows which accounts synced successfully ✅
6. Shows which had errors ❌ with reason

---

## Common Error Codes

| Error | Meaning | Fix |
|-------|---------|-----|
| (#100) Object does not exist | Missing permissions | Request permissions in App Review |
| fan_count field not found | Using URL instead of Page ID | Use numeric Page ID only |
| Requests blocked | API disabled or quota exceeded | Enable API / check quota |
| Invalid token | Expired or incorrect token | Generate new long-lived token |
| CORS error | Not same origin | Check domain settings in App |

---

## Deployment Notes

1. **Environment Variables:**
   - Add all credentials to Vercel project settings
   - Restart deployment after adding env vars
   - Test sync works after redeploy

2. **Encryption:**
   - Credentials are encrypted before storing in DB
   - `ENCRYPTION_KEY` must be 32 characters
   - Keep same key across deployments

3. **Rate Limits:**
   - Facebook: 200 calls/user/hour
   - Instagram: Same as Facebook
   - YouTube: 10,000 quota units/day (default)

4. **Token Refresh:**
   - Facebook tokens expire in 60 days (long-lived)
   - Instagram uses same token
   - YouTube OAuth tokens expire in 1 hour (need refresh token)
   - API Keys don't expire
