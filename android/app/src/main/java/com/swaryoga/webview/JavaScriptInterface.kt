package com.swaryoga.webview

import android.app.Activity
import android.webkit.JavascriptInterface
import com.swaryoga.api.TokenManager
import com.google.gson.Gson

/**
 * JavaScript Interface for WebView
 *
 * Allows JavaScript to call native Android methods and vice versa
 *
 * Usage in JavaScript:
 * ```javascript
 * SwarYoga.getToken((token) => { console.log(token); });
 * SwarYoga.isLoggedIn((loggedIn) => { console.log(loggedIn); });
 * SwarYoga.saveToken('abc123');
 * ```
 */
class JavaScriptInterface(
    private val activity: Activity,
    private val tokenManager: TokenManager
) {

    private val gson = Gson()

    /**
     * Get JWT token from native storage
     * Called from JavaScript with callback
     */
    @JavascriptInterface
    fun getToken(callback: String? = null): String? {
        return tokenManager.getToken()
    }

    /**
     * Save JWT token to native storage
     */
    @JavascriptInterface
    fun saveToken(token: String) {
        tokenManager.saveToken(token)
    }

    /**
     * Check if user is logged in
     */
    @JavascriptInterface
    fun isLoggedIn(): Boolean {
        return tokenManager.isLoggedIn()
    }

    /**
     * Clear token (logout)
     */
    @JavascriptInterface
    fun logout() {
        tokenManager.clearToken()
    }

    /**
     * Get user data
     */
    @JavascriptInterface
    fun getUser(): String? {
        return tokenManager.getUser()
    }

    /**
     * Save user data
     */
    @JavascriptInterface
    fun saveUser(userJson: String) {
        tokenManager.saveUser(userJson)
    }

    /**
     * Get app version
     */
    @JavascriptInterface
    fun getAppVersion(): String {
        return activity.packageManager
            .getPackageInfo(activity.packageName, 0)
            .versionName ?: "1.0.0"
    }

    /**
     * Trigger native share intent
     */
    @JavascriptInterface
    fun share(title: String, message: String, url: String) {
        activity.runOnUiThread {
            val shareIntent = android.content.Intent().apply {
                action = android.content.Intent.ACTION_SEND
                putExtra(android.content.Intent.EXTRA_SUBJECT, title)
                putExtra(android.content.Intent.EXTRA_TEXT, "$message\n$url")
                type = "text/plain"
            }
            activity.startActivity(
                android.content.Intent.createChooser(shareIntent, "Share via")
            )
        }
    }

    /**
     * Log message to Android logs
     */
    @JavascriptInterface
    fun log(message: String) {
        android.util.Log.d("SwarYogaWeb", message)
    }

    /**
     * Show toast notification
     */
    @JavascriptInterface
    fun showToast(message: String) {
        activity.runOnUiThread {
            android.widget.Toast.makeText(
                activity,
                message,
                android.widget.Toast.LENGTH_SHORT
            ).show()
        }
    }

    /**
     * Close the app
     */
    @JavascriptInterface
    fun exitApp() {
        activity.finish()
    }

    /**
     * Get device information
     */
    @JavascriptInterface
    fun getDeviceInfo(): String {
        val deviceInfo = mapOf(
            "manufacturer" to android.os.Build.MANUFACTURER,
            "model" to android.os.Build.MODEL,
            "osVersion" to android.os.Build.VERSION.SDK_INT,
            "deviceId" to android.provider.Settings.Secure.getString(
                activity.contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            )
        )
        return gson.toJson(deviceInfo)
    }
}
