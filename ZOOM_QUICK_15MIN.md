# ⚡ Quick Action: Get Zoom Credentials (15 Minutes)

**Status:** You have a licensed Zoom account ✅

**Time to complete:** ~15 minutes

---

## 📋 Your Tasks (In Order)

### Task 1: Go to Zoom Marketplace (2 minutes)

```
1. Open: https://marketplace.zoom.us/
2. Click "Sign In" → Use your Zoom admin account
3. You should see "Develop" in top menu
```

**✓ Checkpoint:** You're logged into Zoom Marketplace

---

### Task 2: Create Server-to-Server OAuth App (3 minutes)

```
1. Click "Develop" in top menu
2. Click "Build App"
3. Select "Server-to-Server OAuth" (third option)
4. Fill the form:
   - App Name: Swar Yoga Live Workshops
   - Company Name: Swar Yoga
   - Developer Name: Your Name
   - Developer Email: Your Email
5. Click "Create"
```

**✓ Checkpoint:** App created! You're now on the app page

---

### Task 3: Copy Your 3 Credentials (5 minutes)

**Look for "App Credentials" section on your app page**

#### Get Client ID:
```
Find: Client ID field
Copy: The alphanumeric string (very long)
Paste here: _________________________________
```

#### Get Client Secret:
```
Find: Client Secret field
Click: "Show" if hidden
Copy: The string
Paste here: _________________________________
```

#### Get Account ID:
```
Find: Account ID (on right side panel)
Copy: The string (shorter than Client ID)
Paste here: _________________________________
```

**✓ Checkpoint:** You have all 3 credentials

---

### Task 4: Enable Recording Settings (3 minutes)

#### In Zoom Marketplace (still on app page):

```
Scroll to "Scope" section
Make sure these are enabled (toggle ON):
  ☑ meeting:read
  ☑ meeting:write
  ☑ recording:read
  ☑ recording:write
  ☑ user:read
```

#### In Zoom Account Settings:

```
1. Go: https://zoom.us/account/my/feature
2. Find: Recording section
3. Toggle ON: Cloud Recording
4. Set: Default = "Record audio and video"
5. Click: Save
```

**✓ Checkpoint:** Recording enabled!

---

### Task 5: Update .env.local (2 minutes)

**Open file:** `./.env.local`

**Find these lines:**
```env
ZOOM_CLIENT_ID=your_zoom_client_id_here
ZOOM_CLIENT_SECRET=your_zoom_client_secret_here
ZOOM_ACCOUNT_ID=your_zoom_account_id_here
```

**Replace with your actual values:**
```env
ZOOM_CLIENT_ID=ACdkx_vL9kVsXxVzL9k...
ZOOM_CLIENT_SECRET=aBc123XyZ456...
ZOOM_ACCOUNT_ID=ABC123xyz456
```

**Save the file.**

**✓ Checkpoint:** Credentials saved!

---

## ✅ Verification Checklist

When complete, verify:

- [ ] Marketplace login successful
- [ ] Server-to-Server OAuth app created
- [ ] Client ID copied
- [ ] Client Secret copied
- [ ] Account ID copied
- [ ] Recording scopes enabled
- [ ] Cloud Recording toggled ON
- [ ] Default recording set to audio+video
- [ ] `.env.local` updated with credentials
- [ ] File saved

---

## 🎯 Next Steps (After This)

```
1. Install dependencies:
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner axios

2. Restart dev server:
   npm run dev

3. You're ready for Phase 2 frontend development!
```

---

## 🚨 If You Get Stuck

### "Can't find Client ID/Secret"
→ Make sure you're on the app page, not marketplace home
→ Look for "App Credentials" section
→ Scroll down if needed

### "Can't find Account ID"
→ It's on the RIGHT side of the app page
→ Different from Client ID (shorter)
→ Usually looks like: ABC123xyz456

### "Recording not in settings"
→ Go to: https://zoom.us/account/my/feature
→ Make sure you're logged in
→ Scroll down to find Recording section

### "Still stuck?"
→ Follow full guide: `ZOOM_OAUTH_SETUP_GUIDE.md`
→ More detailed with screenshots description

---

## 📞 Support

Need help? Check:
1. `ZOOM_OAUTH_SETUP_GUIDE.md` - Full detailed guide
2. `CREDENTIALS_COLLECTED.md` - Tracking checklist
3. `QUICK_START_AWS_ZOOM.md` - Overall setup

---

**Ready? Let's go! ⏰ 15 minutes to complete!**
