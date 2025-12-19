# Social Login Setup Guide

This guide explains how to configure Google, Facebook, and Apple OAuth for the Swar Yoga website.

## Environment Variables Required

Add these to your `.env.local` (local development) and Vercel dashboard (production):

```env
# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here

# Facebook OAuth
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id_here

# Apple OAuth (optional, requires more setup)
NEXT_PUBLIC_APPLE_CLIENT_ID=your_apple_client_id_here
NEXT_PUBLIC_APPLE_TEAM_ID=your_apple_team_id_here
NEXT_PUBLIC_APPLE_KEY_ID=your_apple_key_id_here
```

---

## 1. Google OAuth Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: "Swar Yoga"
3. Enable "Google+ API"

### Step 2: Create OAuth Credentials
1. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
2. Choose **Web application**
3. Add authorized redirect URIs:
   - `http://localhost:3000` (local)
   - `https://swar-yoga-web-mohan-fl3pggeek-swar-yoga-projects.vercel.app` (production)
   - `https://yourdomain.com` (if you have a custom domain)

### Step 3: Get Client ID
- Copy the **Client ID** from the credentials
- This is your `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

### Step 4: Configure Vercel
1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project: `swar-yoga-web-mohan`
3. Go to **Settings** → **Environment Variables**
4. Add: `NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id`
5. Make sure it applies to **Production** environment
6. Redeploy

---

## 2. Facebook OAuth Setup

### Step 1: Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Click **Create App** → **Consumer** → **Build an app**
3. Name it "Swar Yoga"
4. Choose **Facebook Login**

### Step 2: Get App ID
- Go to **Settings** → **Basic**
- Copy the **App ID**
- This is your `NEXT_PUBLIC_FACEBOOK_APP_ID`

### Step 3: Configure Allowed Domains
1. In app settings, add **Facebook Login** product
2. Go to **Facebook Login** → **Settings**
3. Add Valid OAuth Redirect URIs:
   - `http://localhost:3000/` (local)
   - `https://swar-yoga-web-mohan-fl3pggeek-swar-yoga-projects.vercel.app/` (production)

### Step 4: Configure Vercel
Same as Google - add `NEXT_PUBLIC_FACEBOOK_APP_ID` to Vercel environment variables

---

## 3. Apple Sign In Setup (Optional)

This is more complex and requires an Apple Developer Account.

### Step 1: Create Apple Services ID
1. Go to [Apple Developer](https://developer.apple.com)
2. Go to **Certificates, Identifiers & Profiles**
3. Create a new **Services ID**
4. Name it: "Swar Yoga Sign In"

### Step 2: Configure the Service ID
1. Enable **Sign In with Apple**
2. Add Web Domains:
   - `localhost:3000`
   - `swar-yoga-web-mohan-fl3pggeek-swar-yoga-projects.vercel.app`
3. Add Return URLs for each domain

### Step 3: Get Credentials
- Services ID = `NEXT_PUBLIC_APPLE_CLIENT_ID`
- Team ID = Found in [Account Settings](https://developer.apple.com/account)
- Key ID = Create a new key for "Sign In with Apple"

---

## Testing Social Login Locally

1. Add environment variables to `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
```

2. Run development server:
```bash
npm run dev
```

3. Visit [http://localhost:3000/signup](http://localhost:3000/signup)

4. Click on Google/Facebook buttons - they should now work!

---

## Testing in Production

After adding environment variables to Vercel:

1. Go to Vercel dashboard
2. Wait for redeployment (usually automatic)
3. Visit your production domain
4. Test social login buttons

---

## Troubleshooting

### Error: "Google SDK not loaded"
- **Cause**: Environment variable not set or network issue
- **Fix**: 
  1. Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in Vercel
  2. Redeploy the project
  3. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Error: "Facebook SDK not loaded"
- **Cause**: Same as above
- **Fix**: Check `NEXT_PUBLIC_FACEBOOK_APP_ID` in Vercel

### OAuth not redirecting to profile
- **Cause**: Backend API `/api/auth/[provider]` is failing
- **Fix**: Check:
  1. Are backend routes created? (✅ Already created)
  2. Is MongoDB connection working?
  3. Check browser console for API errors

### Domain mismatch errors
- **Cause**: Redirect URI in OAuth provider doesn't match actual domain
- **Fix**: Add your Vercel domain to allowed URIs:
  - `https://swar-yoga-web-mohan-fl3pggeek-swar-yoga-projects.vercel.app`
  - Or add your custom domain if you have one

---

## File References

- **Component**: `/components/SocialLoginButtons.tsx`
- **Google API Route**: `/app/api/auth/google/route.ts`
- **Facebook API Route**: `/app/api/auth/facebook/route.ts`
- **Apple API Route**: `/app/api/auth/apple/route.ts`
- **Signup Page**: `/app/signup/page.tsx`

---

## Next Steps

1. ✅ Create Google Cloud project → Get Client ID
2. ✅ Create Facebook app → Get App ID
3. ✅ Add both to Vercel environment variables
4. ✅ Redeploy to production
5. ✅ Test social login on live site

**Once you have the IDs, reply with:**
```
Google Client ID: (paste here)
Facebook App ID: (paste here)
```

Then I'll add them to Vercel for you! 🚀
