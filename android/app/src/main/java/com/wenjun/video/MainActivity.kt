package com.wenjun.video

import android.annotation.SuppressLint
import android.content.pm.ActivityInfo
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import java.io.ByteArrayInputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * 文俊影视 - WebView主Activity
 * 加载本地HTML + 原生HTTP代理绕过CORS
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var isFullscreen = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        setContentView(webView)
        configureWebView()
        webView.loadUrl("file:///android_asset/index.html")
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            setSupportZoom(false)
            builtInZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT
            // 允许file://页面发起跨域请求
            allowUniversalAccessFromFileURLs = true
            allowFileAccessFromFileURLs = true
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url?.toString() ?: return null
                // 拦截需要代理的API请求
                if (url.contains("suoniapi.com/api.php") || url.contains("hhzyapi.com/api.php") || url.contains("duanju.click/api/short")) {
                    return proxyRequest(url)
                }
                return null
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // 初始化后注入JS修复状态栏时间
                view?.evaluateJavascript("""
                    if(typeof App !== 'undefined' && App.updateClock) App.updateClock();
                """.trimIndent(), null)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            private var customView: View? = null
            private var customViewCallback: CustomViewCallback? = null

            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                if (customView != null) {
                    callback?.onCustomViewHidden()
                    return
                }
                customView = view
                customViewCallback = callback
                window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                (window.decorView as android.view.ViewGroup).addView(
                    view, FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                    )
                )
                webView.visibility = View.GONE
                isFullscreen = true
            }

            override fun onHideCustomView() {
                if (customView == null) return
                (window.decorView as android.view.ViewGroup).removeView(customView)
                customView = null
                customViewCallback?.onCustomViewHidden()
                window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                webView.visibility = View.VISIBLE
                isFullscreen = false
            }
        }

        webView.setOnKeyListener { _, keyCode, event ->
            if (keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_UP) {
                if (webView.canGoBack()) {
                    webView.goBack()
                    true
                } else if (isFullscreen) {
                    webView.webChromeClient?.onHideCustomView()
                    true
                } else {
                    false
                }
            } else false
        }
    }

    /**
     * 原生HTTP代理 - 绕过CORS限制
     */
    private fun proxyRequest(urlStr: String): WebResourceResponse? {
        return try {
            val url = URL(urlStr)
            val conn = url.openConnection() as HttpURLConnection
            conn.apply {
                connectTimeout = 10000
                readTimeout = 10000
                setRequestProperty("User-Agent", "WenJunVideo/1.0 (Android)")
                setRequestProperty("Accept", "application/json")
                requestMethod = "GET"
            }
            val inputStream = conn.inputStream
            val contentType = conn.contentType ?: "application/json"
            val encoding = conn.contentEncoding ?: "UTF-8"

            // 读取全部响应数据
            val bytes = inputStream.readBytes()
            inputStream.close()
            conn.disconnect()

            WebResourceResponse(
                contentType.split(";")[0].trim(),
                encoding,
                ByteArrayInputStream(bytes)
            )
        } catch (e: Exception) {
            android.util.Log.e("WenJunVideo", "Proxy error: ${e.message}")
            null
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else if (isFullscreen) {
            webView.webChromeClient?.onHideCustomView()
        } else {
            super.onBackPressed()
        }
    }
}
