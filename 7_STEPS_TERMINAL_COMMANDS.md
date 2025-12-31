# 🚀 SWAR YOGA - 7 STEPS (COPY & PASTE TERMINAL COMMANDS)

**Print this or keep it open while running commands!**

---

## STEP 1️⃣: CREATE ANDROID KEYSTORE (15 min)

### Copy & Paste This Command:
```bash
keytool -genkey -v -keystore ~/.android/swar-yoga-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias swar-yoga-key
```

### When Prompted, Enter:
```
Keystore password: [YOUR STRONG PASSWORD - WRITE IT DOWN!]
Re-enter password: [SAME PASSWORD]
First and Last Name: Mohan Kalburgi
Organization: Swar Yoga
City or Locality: [Your city]
State or Province: [Your state]
Country Code: IN
Correct? (yes/no): yes
```

✅ **Result:** Keystore file created at `~/.android/swar-yoga-release.keystore`

---

## STEP 2️⃣: BUILD SIGNED APK (15 min)

### Copy & Paste These Commands:
```bash
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan/android

./gradlew bundleRelease
```

⏳ **Wait for:** `BUILD SUCCESSFUL` message

✅ **Result:** File created at `app/release/app-release.aab` (~20 MB)

---

## STEP 3️⃣: SETUP GOOGLE PLAY LISTING (30 min)

### Open Google Play Console:
```bash
open "https://play.google.com/console/u/0/developers/6821035854768036351/app/4975223271289856598/overview"
```

### Fill These Fields:

**SHORT DESCRIPTION:**
```
Explore yoga workshops, courses & life planning in Hindi, English & Marathi.
```

**FULL DESCRIPTION:**
```
Swar Yoga brings ancient yoga wisdom to modern life with:

• Online, Offline & Residential yoga workshops
• Courses in Pranayama, Meditation & Asanas
• Life planner with Panchang (Hindu calendar)
• Expert instructors (Hindi, English, Marathi)
• Easy payment & registration
• Order tracking & history

Features:
✓ Browse & register workshops
✓ View detailed instructor profiles
✓ Panchang calendar for daily guidance
✓ Secure PayU payment processing
✓ Quick registration process
✓ Order history & tracking

Perfect for:
• Yoga beginners & experienced practitioners
• People seeking holistic wellness
• Hindi/English/Marathi speakers
• Anyone interested in pranayama & meditation

Start your yoga journey today!
```

**PRIVACY POLICY URL:**
```
https://swaryoga.com/privacy-policy
```

**SUPPORT EMAIL:**
```
support@swaryoga.com
```

**CATEGORY:**
```
Health & Fitness
```

**SCREENSHOTS & GRAPHICS:**
Upload these 5 files from `/android/` folder:
- screenshot-1.png (1080×1920)
- screenshot-2.png (1080×1920)
- screenshot-3.png (1080×1920)
- screenshot-4.png (1080×1920)
- screenshot-5.png (1080×1920)
- feature-graphic.png (1024×500)
- ic_launcher.png (512×512)

✅ **Result:** Google Play listing complete

---

## STEP 4️⃣: UPLOAD SIGNED APK (5 min)

### In Google Play Console:

1. Go to: **Release** → **Production**
2. Click: **Create new release**
3. Upload: `app-release.aab`
   - Located at: `/Users/mohankalburgi/Downloads/swar-yoga-web-mohan/android/app/release/app-release.aab`
4. Add Release Notes:
```
Version 1.0.0 - Initial Release

Welcome to Swar Yoga! This is our first release featuring:
- Workshop registration & payment
- Life planner with Panchang calendar
- Multi-language support (Hindi, English, Marathi)
- Secure checkout with PayU
```
5. Click: **Review** → **Save**

✅ **Result:** APK uploaded to Google Play

---

## STEP 5️⃣: SUBMIT CONTENT RATING (10 min + 1-2 hours wait)

### In Google Play Console:

1. Go to: **Setup** → **Content rating**
2. Click: **Answer questionnaire**
3. Answer these questions as "No" (it's a wellness app):
   - Violence
   - Sexual content
   - Profanity
   - Drug references
   - Other concerning content
4. Click: **Submit**

⏳ **Wait 1-2 hours for IARC rating certificate**

✅ **Result:** Content rating auto-appears in listing

---

## STEP 6️⃣: TEST ON ANDROID DEVICE (30 min)

### Option A: Real Device
1. Copy `app-release.aab` to your Android phone
2. Install the app
3. Test:
   - [ ] App launches
   - [ ] Login works
   - [ ] Workshop list loads
   - [ ] Can register for workshop
   - [ ] Payment screen works
   - [ ] Life planner loads
   - [ ] No crashes
   - [ ] All buttons work

### Option B: Android Emulator
```bash
open /Applications/Android\ Studio.app
```
Then create virtual device and test same features.

✅ **Result:** App tested and working

---

## STEP 7️⃣: SUBMIT FOR GOOGLE PLAY REVIEW (5 min)

### In Google Play Console:

1. Go to: **Release** → **Production**
2. Verify:
   - [ ] Listing complete
   - [ ] Screenshots uploaded
   - [ ] Rating received
   - [ ] APK uploaded
   - [ ] Content policy accepted
3. Click: **Manage release**
4. Status should show: **Ready to review**
5. Click: **Submit for review**
6. Confirm

⏳ **WAIT 24-48 HOURS for Google approval**

### What Happens:
- ✅ **Approved:** App goes LIVE! 🎉 Users can download
- ⚠️ **Changes Required:** Make changes, resubmit
- ❌ **Rejected:** Fix issues, resubmit

---

## ⏱️ TIMELINE

```
STEP 1: Keystore       15 min  ━━━━━━━
STEP 2: Build APK      15 min  ━━━━━━━
STEP 3: Setup listing  30 min  ━━━━━━━━━━━━━━
STEP 4: Upload APK      5 min  ━
STEP 5: Rating        10 min  ━ + WAIT 1-2 hours
STEP 6: Test          30 min  ━━━━━━━━━━━
STEP 7: Submit         5 min  ━ + WAIT 24-48 hours

Total Your Work: 1.5-2 hours
Total Waiting: 50 hours (1-2 for rating + 24-48 for review)

LAUNCH: Dec 31, 2025 OR Jan 1, 2026 🎉
```

---

## 🆘 IF YOU GET ERRORS

### Keystore Creation Failed:
```bash
# Make sure directory exists
mkdir -p ~/.android

# Try command again
keytool -genkey -v -keystore ~/.android/swar-yoga-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias swar-yoga-key
```

### Build Failed:
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew bundleRelease
```

### Java Not Found:
```bash
# Check Java version
java -version

# If not installed, install from: java.com
```

### Need to Find Your Files:
```bash
# Find keystore
ls -lh ~/.android/swar-yoga-release.keystore

# Find APK
ls -lh /Users/mohankalburgi/Downloads/swar-yoga-web-mohan/android/app/release/
```

---

## ✅ CHECKLIST

### Before Starting:
- [ ] Read this file
- [ ] Have strong password ready
- [ ] Have Google Account ready
- [ ] Have 2-3 hours available
- [ ] Android device or emulator available (optional)

### After Step 1:
- [ ] Keystore created
- [ ] Password written down somewhere safe

### After Step 2:
- [ ] APK file exists at `app/release/app-release.aab`
- [ ] File size ~15-20 MB

### After Step 3:
- [ ] All descriptions filled
- [ ] Screenshots uploaded
- [ ] Graphics uploaded

### After Step 4:
- [ ] APK uploaded to Google Play
- [ ] Release notes added

### After Step 5:
- [ ] Content rating submitted
- [ ] Waiting for IARC certificate

### After Step 6:
- [ ] Tested on device
- [ ] All features work
- [ ] No crashes

### After Step 7:
- [ ] Submitted for review
- [ ] Waiting for Google approval
- [ ] Check email for updates

### After Google Approval:
- [ ] ✅ APP LIVE ON GOOGLE PLAY STORE! 🎉

---

## 🎯 READY TO START?

**Run this command now:**

```bash
keytool -genkey -v -keystore ~/.android/swar-yoga-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias swar-yoga-key
```

**That's STEP 1!** ✨

---

**Questions?** Check:
- `NEXT_STEPS_QUICK_START.md` (full details)
- `README_PRODUCTION_STATUS.md` (overview)
- `ANDROID_APP_STATUS_REPORT.md` (status)

**Good luck! Your app will be live soon!** 🚀

