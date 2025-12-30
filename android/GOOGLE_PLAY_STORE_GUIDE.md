# Swar Yoga Android App - Google Play Store Submission Guide

## 📋 Pre-Submission Checklist

### Account & Setup
- [x] Google Play Developer Account created
- [x] Merchant account verified
- [x] Payment method added
- [ ] Swar Yoga app created in Play Console
- [ ] App bundle generated (AAB format)
- [ ] Signing certificate created and secured

### App Configuration
- [x] Package name: `com.swaryoga`
- [x] Min SDK: API 24 (Android 7.0)
- [x] Target SDK: API 34 (Android 14)
- [x] Version code: 1
- [x] Version name: 1.0.0
- [ ] ProGuard/R8 enabled for release builds
- [ ] Firebase configured
- [ ] Analytics enabled

---

## 🎨 App Assets

### Required Images

#### App Icon (512×512 PNG)
- **File:** `ic_launcher.png`
- **Location:** `app/src/main/res/mipmap-*`
- **Requirements:**
  - Square shape
  - No rounded corners at edges
  - No Google Play branding
  - Must be visible against white & dark backgrounds

#### Feature Graphic (1024×500 PNG)
- **File:** `feature_graphic.png`
- **Requirements:**
  - Landscape orientation
  - Show key app features
  - Include app name if desired
  - Safe area: center 800×500

#### Screenshots (1080×1920 PNG, minimum 5)
- **Screenshot 1:** Landing/Login screen
- **Screenshot 2:** Workshops listing
- **Screenshot 3:** Workshop details
- **Screenshot 4:** Life Planner/Dashboard
- **Screenshot 5:** Payment integration
- **Screenshot 6:** User profile (optional)

### Optional Images
- Promo graphic (180×120)
- Tablet screenshots (1600×2560 / 1200×1920)
- TV banner (1280×720)

---

## 📝 App Store Listing Content

### App Name
```
Swar Yoga
```

### Short Description (80 characters max)
```
Learn authentic yoga practices online and offline with expert instructors.
```

### Full Description (4000 characters max)
```
Welcome to Swar Yoga - Your Gateway to Authentic Yogic Learning

Discover the ancient wisdom of yoga and transform your life with Swar Yoga. 
Whether you're a beginner or an advanced practitioner, our comprehensive 
platform offers everything you need to deepen your yoga practice.

✨ Key Features:

📚 Workshops & Courses
- Online and offline yoga workshops
- Courses in Hindi, English, and Marathi
- Expert instructors with decades of experience
- Residential programs for intensive learning

📅 Life Planner
- Daily task management
- Panchang calendar integration
- Personalized scheduling
- Progress tracking

💰 Easy Payments
- Secure payment processing
- Multiple currency support (INR, USD, NPR)
- Flexible payment plans
- Instant confirmation

👥 Community
- Connect with fellow yogis
- Join group sessions
- Share your progress
- Access exclusive content

🌍 Multilingual Support
- Hindi, English, Marathi
- Timezone-aware scheduling
- Global payment options

📊 Track Your Progress
- Activity history
- Course completion tracking
- Personal statistics
- Certificate management

🔒 Safety & Privacy
- Secure authentication
- Data encryption
- HTTPS connections
- Privacy policy compliance

Whether you're seeking physical wellness, mental clarity, or spiritual growth, 
Swar Yoga is your complete yoga companion.

Start your journey today!

Contact & Support:
📧 Email: support@swaryoga.com
🌐 Website: https://swaryoga.com
📞 Support: Available 24/7
```

### Category
```
Health & Fitness
```

### Content Rating
```
Category: Fitness
Unrated content: None
```

---

## 🔐 Signing Configuration

### Generate Signing Key
```bash
# In Android Studio:
Build → Generate Signed Bundle/APK → APK → Create new keystore

# Fill in:
Store path: ~/swar-yoga-release.keystore
Password: [STRONG_PASSWORD_32+_CHARS]
Alias: swar-yoga-key
Alias password: [SAME_AS_STORE]
Name: Mohan Kalburgi
Organization: Swar Yoga
Country: IN
```

### Save Credentials Securely
```bash
# Create secure credential file
mkdir -p ~/.swar_yoga
chmod 700 ~/.swar_yoga

# Store in environment
export KEYSTORE_PATH="$HOME/.swar_yoga/swar-yoga-release.keystore"
export KEYSTORE_PASSWORD="your_strong_password"
export KEY_ALIAS="swar-yoga-key"
export KEY_PASSWORD="your_strong_password"
```

---

## 🔄 Build Process

### Debug Build (Testing)
```bash
./gradlew clean build
# APK: app/build/outputs/apk/debug/app-debug.apk
```

### Release Build
```bash
# Set environment variables first
export KEYSTORE_PATH="path/to/keystore"
export KEYSTORE_PASSWORD="password"
export KEY_ALIAS="swar-yoga-key"
export KEY_PASSWORD="key_password"

# Build AAB (Android App Bundle)
./gradlew clean bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

### Sign APK Manually
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore ~/swar-yoga-release.keystore \
  app-unsigned.apk swar-yoga-key

# Verify signature
jarsigner -verify -verbose -certs app-unsigned.apk
```

---

## 📱 Testing Before Submission

### Device Testing Checklist
- [ ] Install on minimum API 24 device/emulator
- [ ] Install on latest API device/emulator
- [ ] Test on tablet (if possible)
- [ ] Test with no internet (show error handling)
- [ ] Test with slow internet (show progress)
- [ ] Test all payment flows
- [ ] Test deep linking
- [ ] Test permission requests
- [ ] Test WebView rendering
- [ ] Verify storage permissions

### Functional Testing
```bash
# Test login flow
adb shell am start -a android.intent.action.VIEW \
  -d "https://swaryoga.com/login" \
  com.swaryoga/.MainActivity

# Test workshop listing
adb shell am start -a android.intent.action.VIEW \
  -d "https://swaryoga.com/workshops" \
  com.swaryoga/.MainActivity

# Test payment
adb shell am start -a android.intent.action.VIEW \
  -d "https://swaryoga.com/checkout" \
  com.swaryoga/.MainActivity
```

### Performance Testing
```bash
# Monitor CPU usage
adb shell dumpsys cpuinfo

# Monitor memory
adb shell dumpsys meminfo com.swaryoga

# Monitor network
adb shell dumpsys netstats
```

---

## 📊 Privacy & Compliance

### Privacy Policy
Must include:
- What data is collected
- How data is used
- User rights & choices
- Third-party services (Firebase, PayU)
- Contact information
- GDPR compliance (if applicable)
- CCPA compliance (California users)

**URL:** https://swaryoga.com/privacy-policy

### Permissions Justification

| Permission | Reason |
|-----------|--------|
| INTERNET | API communication |
| ACCESS_NETWORK_STATE | Check connectivity |
| ACCESS_FINE_LOCATION | Location-based services |
| CAMERA | Video workshops (optional) |
| READ_EXTERNAL_STORAGE | Upload documents |

---

## 🚀 Play Store Submission Steps

### Step 1: Create App Listing
1. Go to Play Console
2. Click "Create app"
3. Enter: **Swar Yoga**
4. Select category: **Health & Fitness**
5. Select type: **Free app**
6. Review Play Store policies
7. Accept terms

### Step 2: Upload Assets
1. **App icon:** Upload 512×512 PNG
2. **Feature graphic:** Upload 1024×500 PNG
3. **Screenshots:** Upload 5+ screenshots
4. **Promo video:** Optional (YouTube link)

### Step 3: Fill App Details
1. Short description (80 chars)
2. Full description (4000 chars)
3. Category: Health & Fitness
4. Content rating: Family
5. Website URL: https://swaryoga.com
6. Support email: support@swaryoga.com
7. Privacy policy: https://swaryoga.com/privacy-policy

### Step 4: Content Rating
1. Complete questionnaire
2. Submit for rating
3. Get rating certificate
4. Add rating to listing

### Step 5: Upload APK/AAB
1. Build release bundle: `./gradlew bundleRelease`
2. Go to: Releases → Release management → Create release
3. Select track: **Internal testing** (first)
4. Upload AAB file
5. Set version name & code
6. Review changes

### Step 6: Review & Test
1. Review all information
2. Set release country: India (primary)
3. Set release date: Immediate
4. Click **Review & test release**

### Step 7: Test & Release
1. Test on internal devices (if available)
2. Fix any issues
3. Move to **Closed testing** (beta)
4. Invite testers
5. Monitor feedback
6. Fix bugs
7. Promote to **Production**

---

## 🔄 After Launch

### Monitoring
```
Play Console → Analytics & reports
- Install trends
- Uninstall rates
- Crash reports
- ANR (App Not Responding)
- Ratings & reviews
```

### Version Updates
1. Update version code & name in `build.gradle`
2. Build new AAB: `./gradlew bundleRelease`
3. Upload to Play Console
4. Add release notes
5. Submit for review

### Maintenance
- Monitor crash reports daily
- Respond to user reviews
- Update for new Android versions
- Fix bugs quickly
- Add new features regularly

---

## 📞 Support Contacts

- **Email:** support@swaryoga.com
- **Website:** https://swaryoga.com
- **Play Store:** [Link to app page]
- **Support Page:** https://swaryoga.com/support

---

## ✅ Final Checklist

- [ ] App builds without errors
- [ ] APK/AAB generated successfully
- [ ] Signing certificate created & backed up
- [ ] All assets uploaded (icon, screenshots, etc.)
- [ ] App description complete & proofread
- [ ] Privacy policy published
- [ ] Content rating completed
- [ ] Permissions justified
- [ ] Deep linking tested
- [ ] Payment flow tested
- [ ] WebView rendering verified
- [ ] All endpoints accessible
- [ ] Error handling implemented
- [ ] Crash reporting configured
- [ ] Analytics configured

**Ready for submission!** 🎉
