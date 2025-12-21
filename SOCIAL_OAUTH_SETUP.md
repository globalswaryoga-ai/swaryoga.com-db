# Social Media OAuth Setup Guide

This guide provides step-by-step instructions for configuring social media OAuth credentials for the Swar Yoga Web application. All OAuth integrations enable users to sign in using their social media accounts.

## Table of Contents
1. [Google OAuth (Sign-In & Social Posting)](#google-oauth)
2. [Facebook OAuth (Sign-In & Social Posting)](#facebook-oauth)
3. [Apple Sign-In](#apple-sign-in)
4. [YouTube (Video Posting & Syncing)](#youtube)
5. [LinkedIn (Professional Networking & Posting)](#linkedin)
6. [Twitter/X (Posting & Analytics)](#twitter)
7. [WhatsApp Business (Direct Messaging)](#whatsapp)
8. [Verification & Testing](#verification--testing)

---

## Google OAuth

### Setup Steps

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com/
   - Create a new project or select an existing one
   - Click "Select a Project" → "New Project"
   - Name it "Swar Yoga" and click "Create"

2. **Enable Google+ API**
   - In the left sidebar, click "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click on it and click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - If prompted, configure the OAuth consent screen first:
     - Click "Configure Consent Screen"
     - Choose "External" user type
     - Fill in required fields (App name: "Swar Yoga", User support email: your email)
     - Scroll down and add scopes: `email`, `profile`, `openid`
     - Add test users if needed
     - Save and continue

4. **Get Your Credentials**
   - Back on Credentials page, click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "Swar Yoga Web"
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://swaryoga.com`
     - `https://www.swaryoga.com`
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback`
     - `https://swaryoga.com/auth/google/callback`
   - Click "Create"
   - Copy the **Client ID** (starts with `.apps.googleusercontent.com`)

5. **Add to .env file**
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_HERE"
   GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET_HERE"
   ```

### Testing Google OAuth
- Navigate to `/signin` page
- Click Google button
- You should be redirected to Google login
- After logging in, you'll be signed into Swar Yoga

---

## Facebook OAuth

### Setup Steps

1. **Create Facebook App**
   - Go to https://developers.facebook.com/
   - Click "My Apps" → "Create App"
   - App Type: "Consumer"
   - App Name: "Swar Yoga"
   - Contact email: your email
   - Click "Create App"

2. **Set Up Facebook Login**
   - In your app dashboard, click "Add Product"
   - Find "Facebook Login" and click "Add"
   - Choose "Web"
   - Set your website URL: `https://swaryoga.com`

3. **Configure OAuth Redirect URIs**
   - In the left sidebar, go to "Settings" → "Basic"
   - Copy your **App ID** and **App Secret**
   - Go to "Products" → "Facebook Login" → "Settings"
   - Valid OAuth Redirect URIs:
     ```
     http://localhost:3000/auth/facebook/callback
     https://swaryoga.com/auth/facebook/callback
     https://www.swaryoga.com/auth/facebook/callback
     ```

4. **Add to .env file**
   ```
   NEXT_PUBLIC_FACEBOOK_APP_ID="YOUR_APP_ID_HERE"
   FACEBOOK_APP_SECRET="YOUR_APP_SECRET_HERE"
   ```

### Instagram Setup (Uses Same Facebook App)
- Go to your Facebook App dashboard
- Navigate to "Settings" → "Basic"
- Add Instagram Business Account integration in "Products"
- The same App ID is used for both Facebook and Instagram posting

---

## Apple Sign-In

### Setup Steps

1. **Register Your App**
   - Go to https://developer.apple.com/
   - Sign in with your Apple Developer account
   - Navigate to "Certificates, Identifiers & Profiles"
   - Click "Identifiers" → "+" to create a new identifier
   - Select "App IDs"
   - Choose "App" and click "Continue"
   - Register your app with Bundle ID: `com.swaryoga.web`

2. **Enable Sign in with Apple**
   - In Identifiers, select your app
   - Check "Sign in with Apple" capability
   - Click "Save"

3. **Create a Service ID**
   - Click "Identifiers" → "+" again
   - Select "Service IDs"
   - Register with identifier: `com.swaryoga.web.signin`
   - Enable "Sign in with Apple"
   - Click "Configure"
   - Add domain: `swaryoga.com`
   - Return URLs:
     ```
     https://swaryoga.com/auth/apple/callback
     ```

4. **No additional .env variables needed**
   - Apple Sign-In uses your domain configuration
   - Ensure NEXT_PUBLIC_APPLE_TEAM_ID is set if using service-to-service communication

### Testing Apple Sign-In
- Navigate to `/signin` page on iOS Safari or Mac
- Click Apple button
- Complete Apple Sign-In flow

---

## YouTube

### Setup Steps

1. **Create YouTube Data API Credentials**
   - Go to https://console.cloud.google.com/
   - Select your "Swar Yoga" project
   - Go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

2. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Restrict the key to YouTube Data API v3
   - Add your domain to restrictions

3. **Add to .env file**
   ```
   YOUTUBE_API_KEY="YOUR_API_KEY_HERE"
   ```

### For Video Uploads (Requires OAuth 2.0)
- Use the Google OAuth flow with additional YouTube scopes
- Scopes needed: `youtube`, `youtube.upload`

---

## LinkedIn

### Setup Steps

1. **Create LinkedIn App**
   - Go to https://www.linkedin.com/developers/apps
   - Click "Create App"
   - App name: "Swar Yoga"
   - LinkedIn Page: Select or create your professional page
   - App logo: Upload Swar Yoga logo
   - Legal agreement: Accept
   - Click "Create app"

2. **Configure OAuth**
   - Go to "Settings" → "Auth"
   - Authorized redirect URLs:
     ```
     http://localhost:3000/auth/linkedin/callback
     https://swaryoga.com/auth/linkedin/callback
     https://www.swaryoga.com/auth/linkedin/callback
     ```
   - Copy **Client ID** and **Client Secret**

3. **Request Access to APIs**
   - Go to "Products" tab
   - Request access to:
     - Sign In with LinkedIn
     - Share on LinkedIn
     - LinkedIn Compliance

4. **Add to .env file**
   ```
   LINKEDIN_CLIENT_ID="YOUR_CLIENT_ID_HERE"
   LINKEDIN_CLIENT_SECRET="YOUR_CLIENT_SECRET_HERE"
   ```

---

## Twitter/X

### Setup Steps

1. **Create Twitter Developer Account**
   - Go to https://developer.twitter.com/
   - Apply for developer access
   - Wait for approval
   - Go to https://developer.twitter.com/en/portal/dashboard

2. **Create a Project and App**
   - Click "Create Project"
   - Project name: "Swar Yoga"
   - Use case: "Content and analytics"
   - Click "Next"
   - App name: "Swar Yoga Web"

3. **Configure Your App Settings**
   - Go to "Settings" → "Authentication Settings"
   - Enable "3-legged OAuth"
   - Callback URLs:
     ```
     http://localhost:3000/auth/twitter/callback
     https://swaryoga.com/auth/twitter/callback
     https://www.swaryoga.com/auth/twitter/callback
     ```
   - Website URL: `https://swaryoga.com`
   - Terms of Service URL: `https://swaryoga.com/terms`
   - Privacy Policy URL: `https://swaryoga.com/privacy`

4. **Get Your Keys**
   - Go to "Keys and Tokens" tab
   - Copy:
     - API Key (Consumer Key)
     - API Secret Key (Consumer Secret)
     - Bearer Token (for read-only access)

5. **Add to .env file**
   ```
   TWITTER_API_KEY="YOUR_API_KEY_HERE"
   TWITTER_API_SECRET="YOUR_API_SECRET_HERE"
   TWITTER_BEARER_TOKEN="YOUR_BEARER_TOKEN_HERE"
   ```

---

## WhatsApp

### Setup Steps

1. **Get WhatsApp Business Account**
   - Go to https://www.whatsapp.com/business/
   - Set up a WhatsApp Business Account
   - Get verified with WhatsApp

2. **Create Meta App**
   - Go to https://developers.facebook.com/
   - Create a new app
   - Add WhatsApp product
   - Get your WhatsApp Business Account ID

3. **Generate Access Token**
   - In App Settings → Business Accounts
   - Generate a System User access token
   - Scope: `whatsapp_business_messaging`

4. **Add to .env file**
   ```
   WHATSAPP_BUSINESS_ACCOUNT_ID="YOUR_ACCOUNT_ID_HERE"
   WHATSAPP_BUSINESS_PHONE_NUMBER="YOUR_PHONE_NUMBER_HERE"
   WHATSAPP_BUSINESS_TOKEN="YOUR_ACCESS_TOKEN_HERE"
   ```

---

## Verification & Testing

### 1. Environment Variables Check
```bash
npm run dev
# Check browser console for SDK loading messages
# Should see: ✅ Google SDK loaded, ✅ Facebook SDK loaded, etc.
```

### 2. Test Sign-In Flow
- Visit `http://localhost:3000/signin`
- Click each social button
- Complete authentication
- Verify you're logged in and redirected to account page

### 3. Check MongoDB
```bash
node test-mongodb.js
# Verify User records created with socialProvider and socialId fields
```

### 4. Check API Logs
```bash
DEBUG=* npm run dev
# Monitor /api/auth/google and /api/auth/facebook endpoints
# Verify JWT token generation
```

### 5. Production Testing
- Deploy to Vercel
- Test on `https://swaryoga.com/signin`
- Verify all environment variables are set in Vercel dashboard

---

## Troubleshooting

### "Google SDK not loaded"
- Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in .env
- Verify network request to `accounts.google.com/gsi/client`
- Clear browser cache and retry

### "Facebook login failed"
- Verify `NEXT_PUBLIC_FACEBOOK_APP_ID` matches your Meta app
- Check app is in development or live mode
- Verify redirect URIs are correct in Meta dashboard

### "Email not provided"
- Some OAuth providers need additional scopes
- Update SDK scope requests in SocialLoginButtons.tsx
- Retry login flow

### "401 Unauthorized on callback"
- Verify API secrets match your OAuth provider
- Check token hasn't expired
- Verify IP allowlist if enabled in your OAuth provider

---

## Security Notes

⚠️ **IMPORTANT**: Never commit `.env` file with real credentials to Git.

1. Add `.env.local` to `.gitignore` for local development
2. Use Vercel Environment Variables for production
3. Rotate API keys regularly
4. Monitor suspicious login attempts
5. Implement rate limiting on auth endpoints (already done in codebase)

---

## API Endpoints

Once configured, the following endpoints are available:

- `POST /api/auth/google` - Google OAuth callback
- `POST /api/auth/facebook` - Facebook OAuth callback
- `POST /api/auth/apple` - Apple Sign-In callback
- `POST /api/social/accounts` - Connect social account
- `GET /api/social/accounts` - List connected accounts
- `POST /api/social/posts` - Create post for social media
- `POST /api/social/posts/[id]/publish` - Publish to specific platform

---

## Next Steps

After setting up OAuth credentials:

1. ✅ Configure all environment variables in `.env` and Vercel
2. ✅ Test sign-in flow on dev and production
3. ⏳ Configure social posting endpoints (see `/api/social/posts/[id]/publish/route.ts`)
4. ⏳ Set up Instagram Business Account for media posting
5. ⏳ Configure LinkedIn and Twitter posting with proper scopes

For social posting implementation details, see: `SOCIAL_MEDIA_POSTING.md` (coming soon)
