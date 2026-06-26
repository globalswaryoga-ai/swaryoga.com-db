package com.swaryoga

import android.annotation.SuppressLint
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebViewClient
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.ProgressBar
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.swaryoga.api.TokenManager
import com.swaryoga.webview.SwarYogaWebViewClient
import com.swaryoga.webview.JavaScriptInterface

/**
 * Main Activity - WebView wrapper for Swar Yoga web application
 *
 * Handles:
 * - Splash screen on launch
 * - WebView setup and configuration
 * - JavaScript bridge
 * - Token injection
 * - Deep linking
 * - External link handling
 * - Network error recovery
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var tokenManager: TokenManager
    private lateinit var splashView: LinearLayout
    private lateinit var errorView: LinearLayout

    companion object {
        private const val TAG = "SwarYoga"
        private const val SPLASH_MIN_DURATION = 1500L // minimum splash display time in ms
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tokenManager = TokenManager(this)
        webView = findViewById(R.id.webview)
        progressBar = findViewById(R.id.progressBar)
        splashView = findViewById(R.id.splashView)
        errorView = findViewById(R.id.errorView)

        // Show splash screen
        splashView.visibility = View.VISIBLE
        webView.visibility = View.GONE
        errorView.visibility = View.GONE

        setupWebView()

        val hasDeepLink = handleDeepLink(intent)

        if (!hasDeepLink) {
            if (isNetworkAvailable()) {
                loadWebsite()
            } else {
                showError("No internet connection", "Please check your network and try again.")
            }
        }

        // Setup retry button
        findViewById<TextView>(R.id.btnRetry)?.setOnClickListener {
            if (isNetworkAvailable()) {
                errorView.visibility = View.GONE
                splashView.visibility = View.VISIBLE
                loadWebsite()
            }
        }
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

                // Caching - use network first, fallback to cache when offline
                cacheMode = if (isNetworkAvailable()) {
                    WebSettings.LOAD_DEFAULT
                } else {
                    WebSettings.LOAD_CACHE_ELSE_NETWORK
                }

                // Compatibility
                userAgentString = buildUserAgent(userAgentString)
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
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
            webViewClient = SwarYogaWebViewClient(this@MainActivity, progressBar) {
                // Callback when page finishes loading - hide splash
                Handler(Looper.getMainLooper()).postDelayed({
                    splashView.visibility = View.GONE
                    webView.visibility = View.VISIBLE
                }, 300) // small delay for smooth transition
            }

            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    progressBar.progress = newProgress
                    progressBar.visibility = if (newProgress == 100) View.GONE else View.VISIBLE
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
        val baseUrl = BuildConfig.WEB_BASE_URL

        // Check if user has token
        val token = tokenManager.getToken()
        val url = if (token != null) {
            "$baseUrl/dashboard"
        } else {
            baseUrl
        }

        Log.d(TAG, "Loading URL: $url")
        webView.loadUrl(url)
    }

    /**
     * Show error screen
     */
    private fun showError(title: String, message: String) {
        splashView.visibility = View.GONE
        webView.visibility = View.GONE
        errorView.visibility = View.VISIBLE
        
        findViewById<TextView>(R.id.errorTitle)?.text = title
        findViewById<TextView>(R.id.errorMessage)?.text = message
    }

    /**
     * Check if network is available
     */
    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    /**
     * Handle deep links from Play Store or external apps.
     * Returns true if a deep link was handled (caller should skip default load).
     */
    private fun handleDeepLink(intent: Intent): Boolean {
        val data: Uri? = intent.data
        if (data != null && (data.host?.contains("swaryoga.com") == true)) {
            val deepLinkUrl = data.toString()
            // Normalize www subdomain to main domain
            val correctedUrl = deepLinkUrl
                .replace("https://www.swaryoga.com", "https://swaryoga.com")
            Log.d(TAG, "Deep link: $correctedUrl")
            webView.loadUrl(correctedUrl)
            return true
        }
        return false
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

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
