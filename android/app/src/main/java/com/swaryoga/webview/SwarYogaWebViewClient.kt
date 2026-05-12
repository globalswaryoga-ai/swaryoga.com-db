package com.swaryoga.webview

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.util.Log
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
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

    // All Swar Yoga domains
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
        
        // Handle Swar Yoga URLs - load in WebView
        if (allowedDomains.any { host.endsWith(it) }) {
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
        
        // Notify MainActivity that page has loaded (hide splash)
        onPageLoaded?.invoke()
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
            Log.e(TAG, "WebView error: $errorCode - $errorDescription")
            
            // Show branded error page
            val html = """
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                            text-align: center;
                            padding: 60px 24px;
                            background: #FAFAFA;
                            color: #111;
                        }
                        .icon { font-size: 64px; margin-bottom: 24px; }
                        h1 { font-size: 20px; color: #111; margin-bottom: 8px; }
                        p { font-size: 14px; color: #666; margin-bottom: 24px; line-height: 1.5; }
                        .btn {
                            display: inline-block;
                            padding: 12px 32px;
                            background: #1E7F43;
                            color: #fff;
                            border: none;
                            border-radius: 8px;
                            font-size: 16px;
                            cursor: pointer;
                            text-decoration: none;
                        }
                        .code { font-size: 11px; color: #999; margin-top: 32px; }
                    </style>
                </head>
                <body>
                    <div class="icon">🍃</div>
                    <h1>Connection Error</h1>
                    <p>Unable to load Swar Yoga.<br>Please check your internet connection.</p>
                    <a class="btn" href="javascript:location.reload()">Try Again</a>
                    <p class="code">Error $errorCode</p>
                </body>
                </html>
            """.trimIndent()
            
            view?.loadData(html, "text/html", "utf-8")
            
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
