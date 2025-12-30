# Swar Yoga Android App - Build & Deployment Guide

## 🔧 Prerequisites

### Required Tools
- Android Studio 2024.1+
- Java 11+ (JDK)
- Gradle 8.0+
- Android SDK 34

### Installation
```bash
# macOS
brew install android-studio
brew install openjdk@11

# Export Java home
export JAVA_HOME=$(/usr/libexec/java_home -v 11)

# Verify installation
java -version
gradle --version
```

---

## 📦 Project Setup

### Clone & Initialize
```bash
cd /path/to/swar-yoga-web-mohan/android
./gradlew wrapper
./gradlew help
```

### Sync Dependencies
```bash
./gradlew clean
./gradlew build --refresh-dependencies
```

---

## 🏗️ Build Configurations

### Debug Build (Development)
```bash
# Full build
./gradlew clean assembleDebug

# Install on connected device
./gradlew installDebug

# Run with logging
DEBUG_PAYU=1 ./gradlew run
```

**Output:** `app/build/outputs/apk/debug/app-debug.apk`

### Release Build (Production)
```bash
# Set environment variables
export KEYSTORE_PATH="$HOME/.swar_yoga/swar-yoga-release.keystore"
export KEYSTORE_PASSWORD="your_password"
export KEY_ALIAS="swar-yoga-key"
export KEY_PASSWORD="your_password"

# Build AAB (recommended for Play Store)
./gradlew clean bundleRelease

# Or build APK if needed
./gradlew clean assembleRelease
```

**Output:** 
- AAB: `app/build/outputs/bundle/release/app-release.aab`
- APK: `app/build/outputs/apk/release/app-release.apk`

---

## 🔑 Signing Configuration

### Step 1: Generate Keystore
```bash
# Create keystore directory
mkdir -p ~/.swar_yoga
chmod 700 ~/.swar_yoga

# Generate keystore (valid for 10000 days)
keytool -genkey -v -keystore ~/.swar_yoga/swar-yoga-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias swar-yoga-key \
  -storepass "YourStrongPassword123!" \
  -keypass "YourStrongPassword123!" \
  -dname "CN=Mohan Kalburgi,O=Swar Yoga,L=India,C=IN"

# Verify keystore
keytool -list -v -keystore ~/.swar_yoga/swar-yoga-release.keystore \
  -storepass "YourStrongPassword123!"
```

### Step 2: Save Credentials
```bash
# Create secure credential file
cat > ~/.swar_yoga/.env << EOF
KEYSTORE_PATH=$HOME/.swar_yoga/swar-yoga-release.keystore
KEYSTORE_PASSWORD=YourStrongPassword123!
KEY_ALIAS=swar-yoga-key
KEY_PASSWORD=YourStrongPassword123!
EOF

chmod 600 ~/.swar_yoga/.env

# Load in build
source ~/.swar_yoga/.env
```

### Step 3: Build Signed APK
```bash
# In Android Studio:
# Build → Generate Signed Bundle/APK → APK → Select keystore

# Or via command line:
./gradlew bundleRelease \
  -PKEYSTORE_PATH="$HOME/.swar_yoga/swar-yoga-release.keystore" \
  -PKEYSTORE_PASSWORD="YourStrongPassword123!" \
  -PKEY_ALIAS="swar-yoga-key" \
  -PKEY_PASSWORD="YourStrongPassword123!"
```

---

## 🧪 Testing & Verification

### Unit Tests
```bash
# Run unit tests
./gradlew test

# Run with coverage
./gradlew test jacocoTestReport

# Run specific test
./gradlew testDebugUnitTest --tests com.swaryoga.api.TokenManagerTest
```

### Instrumented Tests
```bash
# Run on connected device/emulator
./gradlew connectedAndroidTest

# Run specific test
./gradlew connectedAndroidTest --tests com.swaryoga.api.*
```

### Manual Testing
```bash
# Install debug APK
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n com.swaryoga/.MainActivity

# View logs
adb logcat -s SwarYoga*

# Test deep link
adb shell am start -a android.intent.action.VIEW \
  -d "https://swaryoga.com/workshops" \
  com.swaryoga/.MainActivity

# Check WebView
adb shell am start -n com.swaryoga/.MainActivity
adb logcat | grep "webkit"
```

---

## 📊 Performance Profiling

### CPU Profiling
```bash
# Enable CPU profiler
adb shell setprop debug.force_rtl true

# Monitor CPU
adb shell top -m 10 | grep swaryoga

# CPU traces
./gradlew profile
```

### Memory Profiling
```bash
# Monitor memory usage
adb shell dumpsys meminfo com.swaryoga | head -30

# Memory leak detection
adb logcat | grep "LeakCanary"

# Memory timeline
adb shell dumpsys meminfo --local com.swaryoga
```

### Network Profiling
```bash
# Monitor network activity
adb shell dumpsys netstats detail

# Check API calls
adb logcat | grep "OkHttp"

# Bandwidth monitoring
adb shell cat /proc/net/dev | grep -E "(wlan0|rmnet0)"
```

---

## 🚀 Play Store Upload

### Prerequisites
- Google Play Developer Account ($25 fee)
- All assets prepared (icon, screenshots, description)
- Privacy policy published
- Content rating completed

### Upload Steps

#### 1. Prepare Release
```bash
# Clean build
./gradlew clean

# Build release bundle
./gradlew bundleRelease

# Verify output
ls -lh app/build/outputs/bundle/release/
```

#### 2. Sign in Play Console
1. Go to https://play.google.com/console
2. Select app: "Swar Yoga"
3. Go to: Releases → Production

#### 3. Upload AAB
1. Click "Create new release"
2. Upload `app-release.aab`
3. Review changes
4. Check for errors
5. Click "Save"

#### 4. Configure Release
```
Release name: Version 1.0.0
Release notes: 
- Initial launch
- Full yoga workshop system
- Payment integration
- Life planner
- Panchang calendar
- Multi-language support
```

#### 5. Review & Rollout
1. Review all information
2. Set rollout: 5% → 25% → 50% → 100%
3. Click "Start rollout to Production"
4. Monitor crash reports

---

## 📈 Post-Launch Monitoring

### Analytics
```
Play Console → Analytics & reports
- Install trends
- Uninstall rates
- Device distribution
- Country breakdown
```

### Crash Monitoring
```
Play Console → Crashes & ANRs
- Crash rate
- ANR (Application Not Responding)
- Affected users
- Stack traces
```

### Ratings & Reviews
```
Play Console → User ratings
- Average rating
- Review count
- Sentiment analysis
- Respond to reviews
```

---

## 🔄 Update Process

### Prepare Update
```bash
# 1. Update version in build.gradle
versionCode = 2
versionName = "1.0.1"

# 2. Update release notes
# 3. Commit changes
git add -A
git commit -m "Version 1.0.1 - Bug fixes and improvements"

# 4. Build release
./gradlew bundleRelease
```

### Submit Update
1. Open Play Console
2. Create new release
3. Upload new AAB
4. Add release notes
5. Test with beta testers first
6. Gradual rollout (5% → 100%)

---

## 🐛 Troubleshooting

### Common Build Issues

#### Build fails with "Gradle sync failed"
```bash
# Clear cache
./gradlew clean
./gradlew --stop

# Resync
./gradlew sync
```

#### "No keystore file" error
```bash
# Verify keystore exists
ls -la ~/.swar_yoga/swar-yoga-release.keystore

# Recreate if needed
keytool -genkey -v -keystore ~/.swar_yoga/swar-yoga-release.keystore ...
```

#### APK not signing
```bash
# Check keystore validity
keytool -list -v -keystore ~/.swar_yoga/swar-yoga-release.keystore

# Verify passwords match
echo "KEYSTORE_PASSWORD: $KEYSTORE_PASSWORD"
echo "KEY_PASSWORD: $KEY_PASSWORD"
```

### Runtime Issues

#### WebView not loading
```bash
# Check logs
adb logcat | grep "WebView"
adb logcat | grep "swaryoga"

# Verify internet permission
adb shell pm dump com.swaryoga | grep INTERNET

# Test connectivity
adb shell curl https://swaryoga.com/api/workshops/list
```

#### Token not persisting
```bash
# Check SharedPreferences
adb shell dumpsys sharedprefs | grep swar_yoga

# Clear and retry
adb shell pm clear com.swaryoga
```

#### Payment flow broken
```bash
# Check PayU configuration
adb logcat | grep PayU

# Verify BuildConfig
adb shell dumpsys com.swaryoga

# Test payment endpoint
curl -X POST https://swaryoga.com/api/payments/payu/initiate ...
```

---

## 📝 Logs & Debugging

### View App Logs
```bash
# Real-time logs
adb logcat -s "SwarYoga"

# Save to file
adb logcat -s "SwarYoga" > app.log

# Filter by level
adb logcat *:W  # Warnings only
adb logcat *:E  # Errors only

# WebView logs
adb logcat | grep "webkit"

# Network logs
adb logcat | grep "okhttp"
```

### Enable Debug Mode
```bash
# Set buildConfig debug flag
adb shell setprop debug.force_rtl true

# Profiler
adb shell am profile start --sampling 1000 com.swaryoga

# ANR detector
adb shell setprop anr_show_background true
```

---

## ✅ Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Release build generated
- [ ] APK/AAB signed correctly
- [ ] Version code incremented
- [ ] Release notes written
- [ ] Assets verified
- [ ] Privacy policy current
- [ ] Terms of service updated
- [ ] Support channels working
- [ ] Analytics configured
- [ ] Crash reporting enabled
- [ ] Firebase configured
- [ ] Ready for Play Store submission

**Happy launching!** 🚀
