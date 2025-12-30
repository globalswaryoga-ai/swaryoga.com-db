# Swar Yoga Android App - README

Complete Android app for Swar Yoga web platform using WebView + Native API integration.

## 📱 Project Structure

```
android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/swaryoga/
│   │   │   │   ├── MainActivity.kt
│   │   │   │   ├── api/
│   │   │   │   │   ├── ApiConfig.kt
│   │   │   │   │   ├── TokenManager.kt
│   │   │   │   │   ├── AuthInterceptor.kt
│   │   │   │   │   └── RetrofitClient.kt
│   │   │   │   └── webview/
│   │   │   │       ├── SwarYogaWebViewClient.kt
│   │   │   │       └── JavaScriptInterface.kt
│   │   │   ├── res/
│   │   │   │   ├── layout/
│   │   │   │   │   └── activity_main.xml
│   │   │   │   └── values/
│   │   │   │       ├── colors.xml
│   │   │   │       ├── strings.xml
│   │   │   │       └── styles.xml
│   │   │   └── AndroidManifest.xml
│   │   ├── test/
│   │   │   └── java/com/swaryoga/api/
│   │   │       └── TokenManagerTest.kt
│   │   └── androidTest/
│   ├── build.gradle
│   └── proguard-rules.pro
├── gradle/
│   └── wrapper/
├── build.gradle
├── settings.gradle
├── gradle.properties
├── .gitignore
├── README.md
├── BUILD_AND_DEPLOYMENT.md
└── GOOGLE_PLAY_STORE_GUIDE.md
```

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Install Java 11
brew install openjdk@11
export JAVA_HOME=$(/usr/libexec/java_home -v 11)

# Install Android Studio
brew install android-studio
```

### 2. Clone Repository
```bash
cd /path/to/swar-yoga-web-mohan
cd android
```

### 3. Build
```bash
# Sync Gradle
./gradlew sync

# Build debug APK
./gradlew assembleDebug

# Install on device
./gradlew installDebug
```

### 4. Run Tests
```bash
# Unit tests
./gradlew test

# Connected device tests
./gradlew connectedAndroidTest
```

---

## 🏗️ Architecture

### WebView-Based Approach
- **Main UI:** WebView rendering swaryoga.com
- **Native Bridge:** JavaScript interface for token management
- **API Layer:** Retrofit for direct API calls
- **Storage:** SharedPreferences for token persistence

### API Flow
```
User → WebView → JavaScript Interface → TokenManager → API Request
                                     ↓
                              AuthInterceptor (Add JWT)
                                     ↓
                              Retrofit → API Server
```

---

## 🔐 Authentication

### Token Management
```kotlin
// Initialize
val tokenManager = TokenManager(context)

// Save token after login
tokenManager.saveToken(jwtToken)

// Get token
val token = tokenManager.getToken()

// Check if logged in
if (tokenManager.isLoggedIn()) {
    // User is authenticated
}

// Logout
tokenManager.clearToken()
```

### JavaScript Bridge
```javascript
// In WebView JavaScript
SwarYoga.getToken(); // Returns JWT token
SwarYoga.saveToken(token); // Save token
SwarYoga.isLoggedIn(); // Check auth status
SwarYoga.logout(); // Clear token
```

---

## 🌐 API Integration

### Configuration
```kotlin
// Auto-configured from BuildConfig
ApiConfig.API_BASE_URL // https://swaryoga.com/api
ApiConfig.BASE_URL     // https://swaryoga.com

// Public endpoints (no auth)
ApiConfig.Public.WORKSHOPS_LIST
ApiConfig.Public.PANCHANG_CALCULATE

// Protected endpoints (JWT required)
ApiConfig.Protected.AUTH_ME
ApiConfig.Protected.WORKSHOPS_REGISTRATIONS
```

### Making Requests
```kotlin
// Retrofit automatically adds token via AuthInterceptor
val apiService = RetrofitClient.getService(ApiService::class.java)
val workshops = apiService.getWorkshops()
val me = apiService.getMe() // Token added automatically
```

---

## 💳 Payment Integration

### PayU Flow
1. User clicks "Pay" on WebView
2. WebView submits to PayU
3. PayU processes payment
4. PayU redirects to callback
5. WebView receives confirmation
6. App updates order status

### Testing Payments
```bash
# Test credentials in Android app
# Set BuildConfig.API_BASE_URL to test PayU endpoint
# Use test payment cards from PayU docs
```

---

## 📚 Key Features

### ✅ Implemented
- WebView rendering of web app
- JWT token management
- Automatic token injection to API requests
- Deep link handling
- External link opening
- Offline error handling
- JavaScript bridge for native features

### 📋 In Development
- Firebase crash reporting
- Analytics tracking
- Push notifications
- Download documents
- Camera access for video
- Location services

---

## 🧪 Testing

### Unit Tests
```bash
./gradlew testDebugUnitTest
```

### Instrumented Tests
```bash
# Connect device/emulator
./gradlew connectedAndroidTest
```

### Manual Testing
```bash
# Debug APK
./gradlew installDebug

# View logs
adb logcat -s "SwarYoga*"

# Test deep link
adb shell am start -a android.intent.action.VIEW \
  -d "https://swaryoga.com/workshops" \
  com.swaryoga/.MainActivity
```

---

## 📱 Device Requirements

| Requirement | Details |
|------------|---------|
| Min SDK | API 24 (Android 7.0) |
| Target SDK | API 34 (Android 14) |
| Min RAM | 2 GB |
| Storage | 50 MB |
| Internet | Required |

---

## 📦 Build Variants

### Debug
```bash
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
# Staging API: https://staging.swaryoga.com/api
```

### Release
```bash
# Set keystore env vars first
export KEYSTORE_PATH="~/.swar_yoga/swar-yoga-release.keystore"
export KEYSTORE_PASSWORD="password"
export KEY_ALIAS="swar-yoga-key"
export KEY_PASSWORD="password"

./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
# Production API: https://swaryoga.com/api
```

---

## 🔄 Gradle Configuration

### build.gradle (app)
```gradle
compileSdk 34
targetSdk 34
minSdk 24
versionCode 1
versionName "1.0.0"
```

### Dependencies
- Kotlin 1.8.10
- AndroidX core, appcompat, webkit
- Retrofit 2.9.0 + OkHttp 4.11.0
- Gson 2.10.1
- JWT 2.0.2
- Firebase 32.3.1
- Testing: JUnit, Mockito, Espresso

---

## 🚀 Deployment

### To Google Play Store
1. See [GOOGLE_PLAY_STORE_GUIDE.md](./GOOGLE_PLAY_STORE_GUIDE.md)

### To Play Console Beta
1. Build release AAB: `./gradlew bundleRelease`
2. Upload to Play Console
3. Distribute to beta testers
4. Collect feedback
5. Fix issues
6. Promote to production

### Manual Distribution
```bash
# Generate signed APK for manual installation
./gradlew assembleRelease

# Install on device
adb install -r app/build/outputs/apk/release/app-release.apk
```

---

## 📖 Documentation

- [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) - Detailed build guide
- [GOOGLE_PLAY_STORE_GUIDE.md](./GOOGLE_PLAY_STORE_GUIDE.md) - Play Store submission
- [../ANDROID_INTEGRATION_GUIDE.md](../ANDROID_INTEGRATION_GUIDE.md) - API integration
- [../API_DOCUMENTATION_ANDROID.md](../API_DOCUMENTATION_ANDROID.md) - API reference

---

## 🐛 Troubleshooting

### Build Fails
```bash
./gradlew clean
./gradlew --stop
./gradlew sync
./gradlew build
```

### Tests Fail
```bash
# Run with verbose logging
./gradlew test -i

# Check logcat
adb logcat
```

### App Crashes
```bash
# View crash logs
adb logcat | grep "AndroidRuntime"

# Check for null pointers
adb logcat | grep "NullPointerException"

# View local logs
adb shell cat /sdcard/Android/data/com.swaryoga/cache/logs
```

---

## 📞 Support

- **Issues:** Check GitHub issues
- **Questions:** Email support@swaryoga.com
- **Documentation:** See docs/ folder

---

## 📄 License

Proprietary - Swar Yoga

---

## 👥 Contributors

- Mohan Kalburgi (Lead Developer)
- Swar Yoga Team

---

## 🎯 Next Steps

1. [ ] Complete icon design
2. [ ] Create screenshots for Play Store
3. [ ] Write app description & keywords
4. [ ] Set up Firebase
5. [ ] Configure analytics
6. [ ] Test payment flows
7. [ ] Beta test with users
8. [ ] Submit to Play Store
9. [ ] Monitor reviews & crashes
10. [ ] Iterate based on feedback

---

**Happy coding!** 🧘
