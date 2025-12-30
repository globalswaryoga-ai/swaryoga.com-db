package com.swaryoga.webview

import android.app.Activity
import android.content.Intent
import android.net.Uri
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
 * - Error handling
 * - Page load state
 */
class SwarYogaWebViewClient(
    private val activity: Activity,
    private val progressBar: ProgressBar
) : WebViewClient() {

    private val swaryogaDomain = "swaryoga.com"

    override fun shouldOverrideUrlLoading(
        view: WebView?,
        request: WebResourceRequest?
    ): Boolean {
        if (view == null || request == null) return false

        val url = request.url.toString()
        
        // Handle Swar Yoga URLs - load in WebView
        if (url.contains(swaryogaDomain)) {
            view.loadUrl(url)
            return true
        }

        // Handle payment URLs - load in WebView
        if (url.contains("payu") || url.contains("payment")) {
            view.loadUrl(url)
            return true
        }

        // Handle external links - open in browser
        try {
            val intent = Intent(Intent.ACTION_VIEW, request.url)
            activity.startActivity(intent)
            return true
        } catch (e: Exception) {
            e.printStackTrace()
            return false
        }
    }

    override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
        super.onPageStarted(view, url, favicon)
        progressBar.visibility = android.view.View.VISIBLE
        progressBar.progress = 0
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        progressBar.visibility = android.view.View.GONE
    }

    override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?
    ) {
        super.onReceivedError(view, request, error)
        
        if (request?.isForMainFrame == true) {
            progressBar.visibility = android.view.View.GONE
            
            // Optionally load error page
            val errorCode = error?.errorCode ?: -1
            val errorDescription = error?.description?.toString() ?: "Unknown error"
            
            val html = """
                <html>
                <head>
                    <style>
                        body { font-family: sans-serif; text-align: center; padding: 50px; }
                        h1 { color: #d32f2f; }
                        p { color: #666; }
                    </style>
                </head>
                <body>
                    <h1>Connection Error</h1>
                    <p>Failed to load page</p>
                    <p style="font-size: 12px;">Error: $errorCode - $errorDescription</p>
                    <p><a href="javascript:location.reload()">Retry</a></p>
                </body>
                </html>
            """.trimIndent()
            
            view?.loadData(html, "text/html", "utf-8")
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
