-keep class com.swaryoga.** { *; }
-keep class com.swaryoga.api.** { *; }
-keep class com.swaryoga.webview.** { *; }

# Retrofit
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions

# OkHttp
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keepattributes Signature
-keepattributes Exceptions

# Gson
-keep class com.google.gson.** { *; }
-keep interface com.google.gson.** { *; }
-keepattributes Signature
-keepattributes Exceptions

# Firebase
-keep class com.google.firebase.** { *; }
-keep interface com.google.firebase.** { *; }

# JWT
-keep class com.auth0.android.jwt.** { *; }

# AndroidX
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Enum classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Remove logging in production
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
