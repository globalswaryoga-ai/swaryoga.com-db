package com.swaryoga

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.webkit.WebChromeClient
import android.webkit.WebViewClient
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.ProgressBar
import androidx.appcompat.app.AppCompatActivity
import com.swaryoga.api.TokenManager
import com.swaryoga.webview.SwarYogaWebViewClient
import com.swaryoga.webview.JavaScriptInterface

/**
 * Main Activity - WebView wrapper for Swar Yoga web application
 *
 * Handles:
 * - WebView setup and configuration
 * - JavaScript bridge
 * - Token injection
 * - Deep linking
 * - External link handling
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var tokenManager: TokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tokenManager = TokenManager(this)
        webView = findViewById(R.id.webview)
        progressBar = findViewById(R.id.progressBar)

        setupWebView()
        handleDeepLink(intent)
        loadWebsite()
    }

    /**
     * Configure WebView settings for optimal performance and compatibility
     */
    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.apply {
            // JavaScript and storage
            settings.apply {
                javaScriptEnabled = true
                javaScriptCanOpenWindowsAutomatically = false
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false

                // Caching
                cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK

                // Compatibility
                userAgentString = buildUserAgent(userAgentString)
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                useWideViewPort = true
                loadWithOverviewMode = true

                // Security
                allowFileAccess = false
                allowContentAccess = true
            }

            // Cookie management
            val cookieManager = CookieManager.getInstance()
            cookieManager.setAcceptCookie(true)
            cookieManager.setAcceptThirdPartyCookies(webView, true)

            // Client handlers
            webViewClient = SwarYogaWebViewClient(this@MainActivity, progressBar)
            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    progressBar.progress = newProgress
                    progressBar.visibility = if (newProgress == 100) android.view.View.GONE else android.view.View.VISIBLE
                }
            }

            // JavaScript interface for native access
            addJavascriptInterface(JavaScriptInterface(this@MainActivity, tokenManager), "SwarYoga")
        }
    }

    /**
     * Load the main website with token injection
     */
    private fun loadWebsite() {
        val baseUrl = BuildConfig.API_BASE_URL.replace("/api", "")

        // Check if user has token
        val token = tokenManager.getToken()
        val url = if (token != null) {
            "$baseUrl/dashboard" // Logged in users go to dashboard
        } else {
            baseUrl // First-time users see landing page
        }

        webView.loadUrl(url)
    }

    /**
     * Handle deep links from Play Store or external apps
     */
    private fun handleDeepLink(intent: Intent) {
        val data: Uri? = intent.data
        if (data != null && data.host?.contains("swaryoga.com") == true) {
            val deepLinkUrl = data.toString()
            webView.loadUrl(deepLinkUrl)
        }
    }

    /**
     * Build custom user agent string to identify app
     */
    private fun buildUserAgent(defaultUserAgent: String): String {
        return "$defaultUserAgent SwarYogaApp/${BuildConfig.VERSION_NAME}"
    }

    /**
     * Handle back button navigation
     */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            true
        } else {
            super.onKeyDown(keyCode, event)
        }
    }

    /**
     * Handle new intents (deep links)
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
