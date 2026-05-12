# Android App (com.swaryoga) - Testing & Deployment Guide

## Version Information
- **App ID**: com.swaryoga
- **Version**: 1.1.0
- **Build Code**: 5
- **APK Size**: 3.7MB
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 34 (Android 14)

## Root Cause Identified & Fixed ✅

**Problem**: App was pointing to `app.swaryoga.com` which had no active Vercel deployment (returned DEPLOYMENT_NOT_FOUND error)

**Solution**: Updated all references to use `swaryoga.com` which is the active production domain

### Files Changed:
1. ✅ `android/app/build.gradle` - Updated API_BASE_URL and WEB_BASE_URL
2. ✅ `android/app/src/main/AndroidManifest.xml` - Updated deep linking config
3. ✅ `android/app/src/main/java/com/swaryoga/MainActivity.kt` - Removed app.swaryoga.com redirect
4. ✅ `android/app/src/main/java/com/swaryoga/webview/SwarYogaWebViewClient.kt` - Removed from allowed domains
5. ✅ `android/app/src/main/res/xml/data_extraction_rules.xml` - Removed domain config
6. ✅ `android/app/src/main/res/values/colors.xml` - Fixed malformed XML

---

## APK Location
```
/Users/mohankalburgi/swaryoga.com-db/android/app/build/outputs/apk/release/app-release.apk
```

---

## Installation & Testing Steps

### Step 1: Install APK on Android Device
```bash
# Connect Android device via USB and enable USB debugging

# Install APK
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Verify installation
adb shell pm list packages | grep com.swaryoga
```

### Step 2: Basic Launch Test
1. Open app from home screen
2. **Expected behavior**: 
   - Splash screen appears (1500ms minimum)
   - Website (https://swaryoga.com) loads
   - If user has token: redirects to /dashboard
   - If no token: shows login page

### Step 3: Authentication Testing
- **Test Case 1**: First-time user
  - Expected: Login page appears
  - Action: Enter credentials and login
  - Verify: Token is saved, user stays logged in after app restart
  
- **Test Case 2**: Returning user
  - Expected: Redirects directly to dashboard
  - Verify: No login required if token exists

### Step 4: Feature Testing

#### E-Learning Videos
- [ ] Navigate to E-Learning section
- [ ] Videos load properly
- [ ] Play button works
- [ ] Video controls visible (play, pause, seek, volume)
- [ ] Full-screen mode works
- [ ] Video quality indicators work

#### Community Section
- [ ] Community page loads
- [ ] Can view posts
- [ ] Can post new content (if authorized)
- [ ] Can view community recordings
- [ ] Likes/comments working

#### Payments (if applicable)
- [ ] Enrollment payment button clickable
- [ ] Payment gateway (Cashfree/PayU) loads
- [ ] Payment completion flows correctly
- [ ] Returns to app after payment

#### Deep Linking
- [ ] Test sharing a link via WhatsApp/Telegram
- [ ] App opens with correct URL
- [ ] Navigation works within link context

### Step 5: Permissions Testing
Verify all permissions are granted:
- [ ] INTERNET - required for loading website
- [ ] NETWORK_STATE - for connectivity check
- [ ] CAMERA - for community features
- [ ] LOCATION - optional, for location-based features
- [ ] STORAGE - for downloads/file access

### Step 6: Network Testing
- [ ] Test on WiFi connection
- [ ] Test on mobile data (4G/5G)
- [ ] Test offline mode: should show error message
- [ ] Test reconnection: retry button works

### Step 7: Error Handling
- [ ] Disable internet → shows error with retry button
- [ ] Network timeout → shows error message
- [ ] Invalid URL → shows error
- [ ] Retry functionality works

### Step 8: Performance Testing
- [ ] App launches in <3 seconds
- [ ] Page navigation is smooth
- [ ] Videos play without stuttering
- [ ] No memory leaks (check via Android Studio)

---

## Debugging Commands

### View App Logs
```bash
adb logcat | grep -E "SwarYoga|WebView|SSL|Certificate"
```

### View Specific App Logs
```bash
adb logcat | grep "com.swaryoga"
```

### Check Network Connectivity
```bash
adb shell dumpsys connectivity
```

### Clear App Data (for fresh testing)
```bash
adb shell pm clear com.swaryoga
```

### View WebView Crashes
```bash
adb logcat *:E | grep WebView
```

### Test Domain Connectivity from Device
```bash
adb shell ping -c 4 swaryoga.com
```

---

## Known Configuration

### API Endpoints
- **Base API**: `https://swaryoga.com/api`
- **Web Base**: `https://swaryoga.com`
- **Allowed Domains**:
  - swaryoga.com
  - www.swaryoga.com
  - crm.swaryoga.com

### Features Enabled
- ✅ JavaScript enabled
- ✅ DOM Storage enabled
- ✅ Database enabled
- ✅ Media playback without user gesture
- ✅ Cookie management enabled
- ✅ Token injection via JavaScript interface
- ✅ Network connectivity detection
- ✅ Error page display
- ✅ Back button navigation

### Security Configuration
- ✅ HTTPS only (cleartext traffic disabled)
- ✅ SSL certificate verification enabled
- ✅ Data extraction protection enabled
- ✅ ProGuard enabled in release build

---

## Deployment to Google Play Store

### Prerequisites
1. Google Play Developer Account ($25 one-time fee)
2. Signed APK (app-release.apk - already built)
3. App screenshots (5)
4. App description
5. Privacy policy
6. Terms of service

### Steps
1. **Create App on Google Play Console**
   - Go to https://play.google.com/console
   - Create new app
   - Fill app details

2. **Upload APK**
   - Navigate to Release → Production
   - Upload app-release.apk
   - Review content rating

3. **Add Store Listing**
   - Add screenshots
   - Add description: "Learn Swar Yoga anytime, anywhere. Access live classes, recordings, and community."
   - Add graphics/icon
   - Set pricing (free or paid)

4. **Privacy & Compliance**
   - Add privacy policy URL
   - Fill target audience
   - Declare permissions usage

5. **Submit for Review**
   - Review all details
   - Submit for review
   - Expected approval: 1-24 hours

### Release Tracks (Recommended Strategy)
1. **Internal Testing** - Test with small team first
2. **Closed Testing** - Beta testers
3. **Open Testing** - Public beta (limited rollout)
4. **Production** - Full release

---

## Rollback Procedure

If issues arise after deployment:

1. **Via Google Play Console**
   - Manage versions
   - Click "Stop rollout" on problematic version
   - Previous version automatically becomes current

2. **APK Revert**
   - Keep previous builds signed with same keystore
   - Upload previous version
   - Test thoroughly before releasing

---

## Post-Launch Monitoring

### Metrics to Track
- Installation count
- Active users
- Crash rate (target: <1%)
- ANR (Application Not Responding) rate
- User ratings and reviews
- Uninstall rate

### Crash Reporting Setup
Enable Firebase Crash Reporting:
```kotlin
// Already configured in build.gradle
firebase_crashlytics
```

View crashes in Firebase Console → Crash Reporting

---

## Next Steps

1. **Immediate Testing**: Install APK on real device and test all features
2. **Fix Any Issues**: Based on testing results
3. **User Acceptance Testing**: Have actual users test the app
4. **Google Play Submission**: Submit to Play Store
5. **Monitor**: Track crashes and user feedback post-launch

---

## Support & Troubleshooting

### App Won't Load
- ✅ Verify internet connection (WiFi and mobile data)
- ✅ Check swaryoga.com is accessible in browser
- ✅ Check device time/date is correct
- ✅ Clear app cache: `adb shell pm clear com.swaryoga`
- ✅ View logcat for SSL errors

### Videos Won't Play
- ✅ Check internet speed (HLS streaming requires stable connection)
- ✅ Try different video
- ✅ Clear browser cache on device
- ✅ Restart app

### Login Issues
- ✅ Check credentials are correct
- ✅ Verify account is active on website
- ✅ Check API connectivity: `adb shell ping swaryoga.com`

### Permissions Issues
- ✅ Grant permissions in Settings → Apps → SwarYoga → Permissions
- ✅ For Android 6+, permissions requested at runtime

---

## Contact & Escalation

For issues during testing:
1. Check logs via ADB
2. Verify device has internet
3. Test same feature in browser on device
4. Screenshot error message
5. Check this guide for troubleshooting

**Last Updated**: May 12, 2026
**Status**: Ready for Testing ✅
