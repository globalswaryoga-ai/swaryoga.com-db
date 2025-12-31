# 📋 Credential Gathering Worksheet

**Date Started:** January 1, 2025  
**Status:** 🔴 In Progress  
**Estimated Time:** 30 minutes

---

## 📌 Instructions

Fill in each section below as you gather credentials. Copy-paste the values directly into your `.env.production` file or your hosting platform's environment variable settings.

**⚠️ IMPORTANT:**
- Keep these values **SECRET** — never share in Slack/emails
- Use `.env.production` locally (never commit!)
- Use your hosting platform's secure env var settings for production
- All fields are **required** for full functionality (except YouTube API Key/Client ID — choose one)

---

## 1️⃣ Facebook Graph API

**Time Estimate:** 10 minutes  
**Difficulty:** Easy

### Step 1: Go to Facebook Developer Portal
```
https://developers.facebook.com/apps
```

### Step 2: Create or Select App
- Click "Create App" if you don't have one
- Select "Business" as app type
- Fill in app name (e.g., "Swar Yoga Social Media")
- Complete the setup wizard

### Step 3: Get App Credentials
- In App Dashboard, go to **Settings → Basic**
- Copy these two values:

```
FACEBOOK_APP_ID = [ _________________________ ]
FACEBOOK_APP_SECRET = [ _________________________ ]
```

### Step 4: Get Page Access Token
- Go to **Messenger → Settings**
- Under "Access Tokens", select your Swar Yoga page
- Click "Generate Token"
- Copy the token:

```
FACEBOOK_PAGE_ACCESS_TOKEN = [ _________________________ ]
```

### ✅ Verification
- [ ] FACEBOOK_APP_ID is numeric (e.g., `1234567890123456`)
- [ ] FACEBOOK_APP_SECRET is 32 characters
- [ ] FACEBOOK_PAGE_ACCESS_TOKEN starts with `EAAB`

---

## 2️⃣ YouTube Data API v3

**Time Estimate:** 10 minutes  
**Difficulty:** Medium

### Option A: Using API Key (Simpler - Recommended)

#### Step 1: Go to Google Cloud Console
```
https://console.cloud.google.com/
```

#### Step 2: Create/Select Project
- Click "Select a Project" at top
- Click "New Project"
- Name: "Swar Yoga Social"
- Click "Create"

#### Step 3: Enable YouTube Data API v3
- In search bar, type "YouTube Data API v3"
- Click the result
- Click "Enable"

#### Step 4: Create API Key
- Left sidebar → "Credentials"
- Click "Create Credentials" → "API Key"
- Copy the key:

```
YOUTUBE_API_KEY = [ _________________________ ]
```

#### Step 5: Restrict Key (Security)
- Click on your new key
- Under "Application restrictions", select "HTTP referrers"
- Add: `*.vercel.app`, `*.yourdomain.com`, `localhost`
- Under "API restrictions", select "YouTube Data API v3"
- Save

### Option B: Using OAuth (If you prefer OAuth)

#### Skip to Step 6 below

### Step 6: Get Your Channel ID
- Go to YouTube channel you want to manage
- Click "Share" → "Copy channel URL"
- URL looks like: `https://www.youtube.com/@SwarYoga/featured`
- Extract the handle: `SwarYoga`

- Now go to: `https://www.youtube.com/@[YourHandle]/about`
- Copy the channel ID from the URL or find it in channel settings
- Format: typically `UCxxxxxxxxxxxxxxxxxx`

```
YOUTUBE_CHANNEL_ID = [ _________________________ ]
```

### ✅ Verification
- [ ] API Key is 39 characters, starts with `AIza`
- [ ] Channel ID starts with `UC` and is 24 characters
- [ ] YouTube Data API v3 is enabled in Google Cloud Console

---

## 3️⃣ X/Twitter API v2

**Time Estimate:** 5 minutes  
**Difficulty:** Easy

### Step 1: Go to Twitter Developer Portal
```
https://developer.twitter.com/
```

### Step 2: Sign In or Create Account
- Click "Sign In"
- Use your Swar Yoga Twitter account
- If first time, fill in developer form (name, use case, etc.)

### Step 3: Create/Select Project
- Click "Projects & Apps" in sidebar
- Click "Create New" → "Project"
- Name: "Swar Yoga Social Media"
- Use case: "Publishing & Analytics"
- Continue through setup

### Step 4: Create App (if needed)
- In your project, click "Create App"
- Name: "Swar Yoga Social"
- Complete setup

### Step 5: Generate Bearer Token
- Click your app
- Go to "Keys & Tokens"
- Click "Generate" next to "Bearer Token"
- Copy the entire token:

```
TWITTER_BEARER_TOKEN = [ _________________________ ]
```

**⚠️ Important:** Token must start with `AAAA` (if it doesn't, regenerate it)

### ✅ Verification
- [ ] Bearer Token starts with `AAAA`
- [ ] Token is ~100+ characters
- [ ] App has Read + Write permissions enabled

---

## 4️⃣ LinkedIn API v2

**Time Estimate:** 5 minutes  
**Difficulty:** Medium

### Step 1: Go to LinkedIn Developer Portal
```
https://www.linkedin.com/developers/apps
```

### Step 2: Create App
- Click "Create app"
- App name: "Swar Yoga Social Media"
- LinkedIn Page: Select your Swar Yoga page
- Complete setup

### Step 3: Get OAuth Access Token
- Go to your app
- Click "Auth" tab
- Under "Authorized redirect URLs", add:
  - `https://yourdomain.com/api/auth/callback`
  - `http://localhost:3000/api/auth/callback`
  - Save

### Step 4: Generate Access Token
- Go to "Test console" or use LinkedIn OAuth flow
- Or use: https://www.linkedin.com/developers/tools/authentication-token
- Click your app → "Auth" → Generate token
- Copy token:

```
LINKEDIN_ACCESS_TOKEN = [ _________________________ ]
```

### Step 5: Get Company ID
- Go to your LinkedIn company page
- URL looks like: `https://www.linkedin.com/company/12345678/`
- Extract the number:

```
LINKEDIN_COMPANY_ID = [ _________________________ ]
```

### ✅ Verification
- [ ] Access Token is 100+ characters
- [ ] Token starts with `Aq`
- [ ] Company ID is numeric (e.g., `12345678`)

---

## 5️⃣ CRON_SECRET (Your Own Secret Key)

**Time Estimate:** 1 minute  
**Difficulty:** Very Easy

### What is it?
A secret key that only your scheduler knows. Prevents random people from triggering your scheduler.

### Create a strong one:
Pick ANY of these options:

**Option A:** Use a secure random generator
```
openssl rand -base64 32
```
This gives you something like: `TmVkq9Xyz2kL8wPqRst+UVwXyZ1a2bCdEfGhIjKlMnOpQ==`

**Option B:** Use a memorable phrase
```
your-super-secret-scheduler-key-12345
```

**Option C:** Generate random string online
```
https://randomkeygen.com/ (copy the "Secure Passphrase" row)
```

Copy your chosen secret:

```
CRON_SECRET = [ _________________________ ]
```

### ✅ Verification
- [ ] At least 20 characters long
- [ ] Contains mix of letters, numbers, symbols
- [ ] Keep this SECRET!

---

## 6️⃣ Summary Checklist

### All Credentials Gathered?
- [ ] FACEBOOK_APP_ID
- [ ] FACEBOOK_APP_SECRET
- [ ] FACEBOOK_PAGE_ACCESS_TOKEN
- [ ] YOUTUBE_API_KEY (or have OAuth alternative)
- [ ] YOUTUBE_CHANNEL_ID
- [ ] TWITTER_BEARER_TOKEN
- [ ] LINKEDIN_ACCESS_TOKEN
- [ ] LINKEDIN_COMPANY_ID
- [ ] CRON_SECRET

### Next Steps (After gathering):
1. Copy all credentials above
2. Go to your production environment (Vercel, AWS, etc.)
3. Add these environment variables
4. Restart your app
5. Proceed to "Configure Scheduler" phase

---

## 📝 Notes

**Gathering Issues?**

| Issue | Solution |
|-------|----------|
| Can't find App ID | Go to Facebook app → Settings → Basic, scroll down |
| Bearer token doesn't start with AAAA | Regenerate it from Keys & Tokens page |
| YouTube API key doesn't work | Verify you enabled "YouTube Data API v3" in Google Cloud |
| LinkedIn token expires | Generate new token from test console |
| Can't find company ID | Go to company page URL, it's the number in the URL |

**Security Tips:**
- ✅ Use `.env.production` locally (never commit)
- ✅ Use hosting platform's secure vault (Vercel Env, AWS Secrets Manager, etc.)
- ✅ Never share tokens in Slack, email, or GitHub
- ✅ Regenerate tokens if accidentally exposed
- ✅ Use `.gitignore` to exclude `.env*` files

---

## ✅ When All Credentials Are Gathered

Proceed to **Step 5: Set Environment Variables** in `DEPLOYMENT_CHECKLIST.md`

You're ready! 🚀
