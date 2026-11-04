package com.swaryoga.webview

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.util.Log
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.appcompat.app.AppCompatActivity

/**
 * Custom WebViewClient for Swar Yoga app
 *
 * Handles:
 * - External link opening in browser
 * - Deep link navigation
 * - Error handling with branded error page
 * - Page load callbacks for splash screen
 */
class SwarYogaWebViewClient(
    private val activity: Activity,
    private val progressBar: ProgressBar,
    private val onPageLoaded: (() -> Unit)? = null
) : WebViewClient() {

    companion object {
        private const val TAG = "SwarYogaWebView"
    }

    // All Swar Yoga domains (exact match or subdomain match only)
    private val allowedDomains = listOf(
        "swaryoga.com",
        "www.swaryoga.com",
        "crm.swaryoga.com"
    )

    override fun shouldOverrideUrlLoading(
        view: WebView?,
        request: WebResourceRequest?
    ): Boolean {
        if (view == null || request == null) return false

        val url = request.url.toString()
        val host = request.url.host ?: ""
        
        // Handle Swar Yoga URLs - load in WebView (exact or subdomain match)
        if (allowedDomains.any { host == it || host.endsWith(".$it") }) {
            view.loadUrl(url)
            return true
        }

        // Handle payment URLs - load in WebView
        if (host.contains("payu") || host.contains("cashfree") || host.contains("payment")) {
            view.loadUrl(url)
            return true
        }

        // Handle external links - open in browser
        try {
            val intent = Intent(Intent.ACTION_VIEW, request.url)
            activity.startActivity(intent)
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error opening external link: $url", e)
            return false
        }
    }

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
        progressBar.visibility = android.view.View.VISIBLE
        progressBar.progress = 0
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        progressBar.visibility = android.view.View.GONE
        Log.d(TAG, "Page loaded: $url")

        // Permanent Anti-Crack Guard: If remote CSS failed to load or is 404, inject bundled core CSS
        view?.evaluateJavascript("""
            (function() {
                var hasActiveStyles = false;
                for (var i = 0; i < document.styleSheets.length; i++) {
                    try {
                        var rules = document.styleSheets[i].cssRules || document.styleSheets[i].rules;
                        if (rules && rules.length > 20) {
                            hasActiveStyles = true;
                            break;
                        }
                    } catch(e) {}
                }
                if (!hasActiveStyles && window.SwarYoga && window.SwarYoga.injectFallbackCss) {
                    console.warn('[SwarYogaApp] No active CSS detected on page. Invoking native bundled CSS fallback.');
                    window.SwarYoga.injectFallbackCss();
                }
            })();
        """.trimIndent(), null)
        
        // Notify MainActivity that page has loaded (hide splash)
        onPageLoaded?.invoke()
    }

    /**
     * Permanent Anti-Crack Request Interceptor:
     * If any Next.js CSS stylesheet fails over network or returns 404 due to new deployments,
     * immediately fallback to the bundled APK assets (swaryoga-core.css) so the page NEVER renders as raw HTML.
     */
    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        val url = request?.url ?: return super.shouldInterceptRequest(view, request)
        val path = url.path ?: ""

        if (path.contains("/_next/static/css/") || (path.endsWith(".css") && (url.host?.contains("swaryoga.com") == true))) {
            try {
                val connection = java.net.URL(url.toString()).openConnection() as java.net.HttpURLConnection
                connection.connectTimeout = 3000
                connection.readTimeout = 4000
                connection.instanceFollowRedirects = true
                connection.connect()

                if (connection.responseCode == 200) {
                    val encoding = connection.contentEncoding ?: "UTF-8"
                    return WebResourceResponse("text/css", encoding, connection.inputStream)
                } else {
                    Log.w(TAG, "CSS network request returned HTTP ${connection.responseCode} for $url. Serving bundled swaryoga-core.css fallback.")
                }
            } catch (e: Exception) {
                Log.w(TAG, "CSS network request error for $url (${e.message}). Serving bundled swaryoga-core.css fallback.")
            }

            // Fallback: Return bundled core CSS from APK assets
            try {
                val assetStream = activity.assets.open("swaryoga-core.css")
                return WebResourceResponse("text/css", "UTF-8", assetStream)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load bundled fallback CSS asset", e)
            }
        }

        return super.shouldInterceptRequest(view, request)
    }

    override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?
    ) {
        super.onReceivedError(view, request, error)
        
        if (request?.isForMainFrame == true) {
            progressBar.visibility = android.view.View.GONE
            
            val errorCode = error?.errorCode ?: -1
            val errorDescription = error?.description?.toString() ?: "Unknown error"
            Log.e(TAG, "WebView error: $errorCode - $errorDescription. Loading bundled offline page.")
            
            // Fallback: Load bundled core front-end page so user never sees a broken page
            view?.loadUrl("file:///android_asset/offline-home.html")
            
            // Also notify so splash hides
            onPageLoaded?.invoke()
        }
    }

    override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
        if (url == null) return false
        return shouldOverrideUrlLoading(view, object : WebResourceRequest {
            override fun getUrl(): Uri = Uri.parse(url)
            override fun isForMainFrame(): Boolean = true
            override fun isRedirect(): Boolean = false
            override fun hasGesture(): Boolean = false
            override fun getMethod(): String = "GET"
            override fun getRequestHeaders(): MutableMap<String, String> = mutableMapOf()
        })
    }
}
