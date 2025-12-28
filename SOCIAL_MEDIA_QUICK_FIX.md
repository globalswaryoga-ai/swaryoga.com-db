# Social Media API Errors - Quick Fix Checklist

## Your Current Issues

### ❌ Facebook & Instagram
**Error:** Permission error #100
**Status:** ⏳ Need app review approval

### ❌ YouTube  
**Error:** API requests blocked
**Status:** ⏳ Need to enable API

---

## 🚀 Quick Fix Steps (Do These Now)

### STEP 1: Fix Facebook & Instagram (Fastest)

**Time Required:** 5-10 minutes + 24-48 hours for app review

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Login and select your app
3. Go to **Settings → Basic**
   - Copy your **App ID**
   - Copy your **App Secret**
4. Go to **Roles → Administrators**
   - Add yourself as Admin role
5. Go to **Permissions and Features**
   - Search for `pages_read_engagement`
   - Click **Request** (not just "Add")
6. Search for `pages_read_user_content`
   - Click **Request**
7. Go to **Features**
   - Search for "Page Public Content Access"
   - Click **Request this feature**
   - Search for "Page Public Metadata Access"
   - Click **Request this feature**
8. Click **Submit for App Review**
9. **Wait for approval** (usually 24-48 hours)

**After Approval:**
1. Go to **Tools → Access Token Debugger**
2. Generate a new access token with all permissions
3. Copy the token
4. In Swar Yoga Admin:
   - Go to **Admin → Social Media Setup**
   - Platform: Facebook
   - Account ID: Use **Page ID only** (numbers, e.g., `61559147565482`)
     - Find Page ID: [Find Your Facebook Page ID](https://findmyfbid.com/)
   - Access Token: Paste the token you generated
   - Click **Connect**

**Same for Instagram:**
1. Platform: Instagram
2. Account ID: Your Instagram Business Account ID
3. Access Token: Can use same Facebook token
4. Click **Connect**

---

### STEP 2: Fix YouTube (Fastest)

**Time Required:** 5-10 minutes

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project named "Swar Yoga"
3. In search bar, type "YouTube Data API"
4. Click on it and click **Enable**
5. Go to **Credentials** (left sidebar)
6. Click **+ Create Credentials** → **API Key**
7. Copy your API Key (starts with AIza...)
8. Go to **API key restrictions** → **Restrict Key**
   - Restriction type: **YouTube Data API v3**
   - Click **Save**
9. Copy this key to your Vercel environment:
   - Go to Vercel Dashboard
   - Select your project
   - Settings → Environment Variables
   - Add: `YOUTUBE_API_KEY` = `your_key_here`
   - Redeploy (manually or wait for next push)
10. In Swar Yoga Admin:
    - Go to **Admin → Social Media Setup**
    - Platform: YouTube
    - Account ID: Your YouTube Channel ID
      - Find it: Go to YouTube → Account → Advanced settings → Channel ID
    - Access Token: Paste your API Key
    - Click **Connect**

---

## 📋 Checklist for Each Platform

### Facebook/Instagram
- [ ] App created at developers.facebook.com
- [ ] Your account is Admin role
- [ ] Requested `pages_read_engagement` permission
- [ ] Requested `pages_read_user_content` permission
- [ ] Requested "Page Public Content Access" feature
- [ ] Requested "Page Public Metadata Access" feature
- [ ] Submitted for App Review
- [ ] ⏳ Waiting for approval...
- [ ] Generated long-lived access token
- [ ] Added to Swar Yoga admin panel
- [ ] Used Page ID (not URL) in Account ID field

### YouTube
- [ ] Created Google Cloud project
- [ ] Enabled YouTube Data API v3
- [ ] Created API Key
- [ ] Restricted key to YouTube API
- [ ] Added to Vercel Environment Variables
- [ ] Added YouTube credentials to Swar Yoga admin panel
- [ ] Used Channel ID in Account ID field
- [ ] Redeployed Vercel

---

## 🧪 Test Your Setup

After completing above steps, go to:
**Admin → Social Media → Click "Sync Analytics"**

You should see:
```
✅ Facebook: 3,456 followers (Last synced: 2 mins ago)
✅ Instagram: 2,891 followers (Last synced: 2 mins ago)
✅ YouTube: 5,234 subscribers (Last synced: 2 mins ago)
```

If you see ❌ errors with helpful tips, that means sync endpoint is working!

---

## 📝 Environment Variables to Add

Go to Vercel project settings and add:

```
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
YOUTUBE_API_KEY=your_api_key
ENCRYPTION_KEY=32_character_random_string
```

(ENCRYPTION_KEY: Generate using `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`)

---

## 🔗 Useful Links

- [Facebook App Dashboard](https://developers.facebook.com/apps)
- [Facebook Page ID Finder](https://findmyfbid.com)
- [Google Cloud Console](https://console.cloud.google.com)
- [YouTube Channel ID](https://youtube.com/account)
- [Swar Yoga Social Media Setup](https://swaryoga.com/admin/social-media-setup)

---

## ⏰ Timeline

| Step | Time | Notes |
|------|------|-------|
| Facebook/Instagram Setup | 5 min | Immediate |
| Facebook/Instagram App Review | 24-48 hrs | Automatic after submission |
| YouTube Setup | 5 min | Immediate |
| Test Sync | 1 min | After credentials added |
| **Total** | **~24-48 hrs** | Due to Facebook review process |

---

## 💬 Questions?

- **"My Page ID isn't working"** → Make sure it's the numeric ID, not the page URL
- **"Token keeps expiring"** → Generate a 60-day long-lived token from Facebook
- **"YouTube still blocked"** → Make sure YouTube Data API v3 is enabled (not just created)
- **"Vercel env vars not working"** → Redeploy after adding variables

---

**After completing these steps, your social media analytics will sync automatically and display on the admin dashboard!** 🎉
