# 🎥 Zoom OAuth Setup Guide - Server-to-Server Integration

> **For Licensed Zoom Account Holders**

This guide will help you create a Server-to-Server OAuth app in your licensed Zoom account and get the credentials needed for Swar Yoga's recorded workshops and live sessions.

---

## 📋 Prerequisites

✅ Licensed Zoom Account (you have this!)
✅ Admin access to Zoom account
✅ Zoom admin portal access
✅ Email address for app registration

---

## 🚀 Step 1: Access Zoom Marketplace

1. Go to **https://marketplace.zoom.us/**
2. Click **Sign In** at the top right
3. Login with your **Zoom admin account** credentials
4. You should see your account/organization name at the top

**✓ Complete this step before moving forward**

---

## 🔧 Step 2: Create Server-to-Server OAuth App

### Navigate to App Development

1. In Zoom Marketplace, click your **account name** → **Develop** → **Build App**
2. Or go directly to: **https://marketplace.zoom.us/develop/create**
3. You should see three app type options:
   - OAuth
   - JWT _(deprecated - don't use)_
   - Server-to-Server OAuth ✅ **← SELECT THIS ONE**

### Create the App

1. Click **Server-to-Server OAuth**
2. Fill in the form:
   - **App Name:** `Swar Yoga Live Workshops`
   - **Company Name:** `Swar Yoga` (or your company)
   - **Developer Name:** Your name
   - **Developer Email:** Your email
3. Click **Create**

**Your app is now created!** 🎉

---

## 🔑 Step 3: Get Your Credentials

After creating the app, you'll see an **app information page**. Look for the **"App Credentials"** section.

### Copy These 3 Values:

#### 1. **Client ID**
- Location: App Credentials section
- Look for field labeled: **Client ID**
- Copy the entire alphanumeric string
- Example: `ACdkx_vL9kVsXxVzL9k...` (long string)

**Paste here:**
```
ZOOM_CLIENT_ID = ___________________________________
```

#### 2. **Client Secret**
- Location: App Credentials section (same as above)
- Look for field labeled: **Client Secret**
- Click **Show** if it's hidden
- Copy the entire string
- Example: `aBc123XyZ456...` (long string)

**Paste here:**
```
ZOOM_CLIENT_SECRET = ___________________________________
```

#### 3. **Account ID**
- Location: Right side panel, labeled **Account ID**
- Not the same as Client ID!
- Usually a shorter alphanumeric string
- Example: `ABC123xyz456`

**Paste here:**
```
ZOOM_ACCOUNT_ID = ___________________________________
```

---

## ✅ Step 4: Enable Required Features

### 1. Enable Cloud Recording

1. Still on your app page, scroll to **Scope** section
2. Look for toggles/checkboxes for:
   - ✅ `meeting:read` 
   - ✅ `meeting:write`
   - ✅ `recording:read`
   - ✅ `recording:write`
   - ✅ `user:read`
3. Make sure all are **enabled** (toggle ON)

### 2. Configure Recording Settings

1. Go to **https://zoom.us/account/my/feature** (your admin account)
2. Scroll to **Recording** section
3. Make sure these are enabled:
   - ✅ **Cloud Recording** — ON
   - ✅ **Auto-delete cloud recordings** — OFF (we manage this)
   - ✅ **Record all meetings** — OFF (optional, we control per-meeting)
   - ✅ **Local recording** — OFF (we only use cloud)

### 3. Set Recording Default

1. Still on feature page
2. Find **Default cloud recording settings**
3. Select: **Record audio and video**
4. Click **Save**

---

## 🔗 Step 5: Add Webhook Endpoint (Optional but Recommended)

Webhooks allow Zoom to notify your app when recordings are ready.

### In Zoom Marketplace (App Page)

1. Go to your app (if not already there)
2. Scroll to **Event Subscriptions** section
3. Click **Enable Event Subscriptions** → **Yes**
4. Enter your webhook URL:
   ```
   https://yourdomain.com/api/webhooks/zoom/recording
   ```
   _(Replace `yourdomain.com` with your actual domain)_
5. Subscribe to these events:
   - ✅ `recording.completed`
   - ✅ `meeting.ended`
6. Click **Save**

**Note:** We'll set up the webhook endpoint in a future step.

---

## 💾 Step 6: Update Your .env.local

Now that you have all three credentials, update your environment file:

### Edit `./.env.local`

Find these lines (we added them earlier):
```env
ZOOM_CLIENT_ID=your_zoom_client_id_here
ZOOM_CLIENT_SECRET=your_zoom_client_secret_here
ZOOM_ACCOUNT_ID=your_zoom_account_id_here
```

Replace with your actual values:
```env
ZOOM_CLIENT_ID=ACdkx_vL9kVsXxVzL9k...
ZOOM_CLIENT_SECRET=aBc123XyZ456...
ZOOM_ACCOUNT_ID=ABC123xyz456
```

**⚠️ IMPORTANT:**
- Never commit `.env.local` to git
- Keep these credentials secret
- Don't share in Slack/email
- Store backup in password manager

---

## 🧪 Step 7: Test the Integration

### Method 1: Quick API Test (Easiest)

1. Open terminal in your project
2. Run this command to test Zoom connection:

```bash
curl -X POST https://zoom.us/oauth/token \
  -H "Authorization: Basic $(echo -n 'YOUR_CLIENT_ID:YOUR_CLIENT_SECRET' | base64)" \
  -d "grant_type=client_credentials"
```

Replace:
- `YOUR_CLIENT_ID` = Your Client ID from step 3
- `YOUR_CLIENT_SECRET` = Your Client Secret from step 3

**Expected response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "meeting:read meeting:write recording:read recording:write user:read"
}
```

If you see this → ✅ **Success!**

### Method 2: Application Test (Full)

1. Make sure `.env.local` is updated with all 3 credentials
2. Restart your dev server:
   ```bash
   npm run dev
   ```
3. Go to your admin panel: **http://localhost:3000/admin**
4. Look for **Workshops** → **Live Session Settings** (we'll create this)
5. Click **Test Zoom Connection**
6. Should see: ✅ "Connection successful!"

---

## 🎯 Quick Checklist

- [ ] Logged into Zoom admin account
- [ ] Created Server-to-Server OAuth app
- [ ] Copied Client ID
- [ ] Copied Client Secret
- [ ] Copied Account ID
- [ ] Enabled required scopes (meeting, recording, user)
- [ ] Enabled Cloud Recording in account
- [ ] Added webhook endpoint (optional)
- [ ] Updated `.env.local` with credentials
- [ ] Restarted dev server (`npm run dev`)
- [ ] Tested API connection (curl or app)

---

## 🚨 Troubleshooting

### "Invalid Client ID/Secret"
- Verify you copied the **exact** strings from Zoom
- Check for extra spaces or line breaks
- Make sure you're in the right app (not someone else's)

### "Unauthorized - 401"
- Check credentials are correct in `.env.local`
- Verify the app **scopes are enabled**
- Try recreating the app token

### "Cloud Recording not enabled"
- Go to **https://zoom.us/account/my/feature**
- Find **Recording** section
- Toggle **Cloud Recording** → ON
- Save changes

### "Webhook not working"
- Make sure domain is publicly accessible (not localhost)
- Check webhook URL is exactly correct
- Verify event subscriptions are enabled
- Check application logs for errors

### Still not working?
1. Check `.env.local` has correct formatting (no quotes, no spaces)
2. Restart dev server: `npm run dev`
3. Check browser console for errors
4. Review application logs

---

## 📚 Related Documentation

- **AWS S3 Setup:** See `AWS_ZOOM_SETUP.md`
- **Environment Variables:** See `QUICK_START_AWS_ZOOM.md`
- **Full Architecture:** See `ARCHITECTURE_DIAGRAM.md`
- **Implementation Details:** See `RECORDED_WORKSHOPS_MEDIA_IMPLEMENTATION.md`

---

## ✨ What's Next?

Once credentials are verified:

1. **Install Dependencies:**
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner axios
   ```

2. **Restart dev server:**
   ```bash
   npm run dev
   ```

3. **Test API endpoints** (coming in Phase 2)

4. **Create recorded workshops page** (Week 2)

---

## 📞 Support

If you run into issues:

1. Check this guide's Troubleshooting section
2. Review Zoom's official docs: https://developers.zoom.us/docs
3. Check your browser console for error messages
4. Review application logs in terminal

---

**You're all set! 🎉 Your Zoom OAuth app is ready to power live workshops and auto-recorded sessions.**

Next step: Install npm dependencies and test the connection!
