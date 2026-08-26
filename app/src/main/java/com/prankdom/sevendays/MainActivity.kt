package com.prankdom.sevendays

import android.content.pm.ActivityInfo
import android.os.Bundle
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

class MainActivity : android.app.Activity() {
    inner class AppBridge {
        @JavascriptInterface
        fun setOrientation(mode: String) {
            runOnUiThread { applyOrientationMode(mode) }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        applyOrientationMode(intent.getStringExtra("orientationMode") ?: "both")

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        val fontBase64 = assets.open("fonts/SevenDays-IndividualGlyphs.ttf").use {
            Base64.encodeToString(it.readBytes(), Base64.NO_WRAP)
        }

        val webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.loadsImagesAutomatically = true
            addJavascriptInterface(AppBridge(), "SevenDaysApp")

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?) =
                    request?.url?.let(assetLoader::shouldInterceptRequest)

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    val css = """
                        @font-face {
                            font-family: 'SevenDaysEmbedded';
                            src: url(data:font/ttf;base64,$fontBase64) format('truetype');
                            font-style: normal;
                            font-weight: 400;
                            font-display: block;
                        }
                        #title, #title span {
                            font-family: 'SevenDaysEmbedded' !important;
                            font-style: normal !important;
                            font-weight: 400 !important;
                        }
                    """.trimIndent()

                    val js = """
                        (() => {
                            const old = document.getElementById('seven-days-embedded-font');
                            if (old) old.remove();
                            const style = document.createElement('style');
                            style.id = 'seven-days-embedded-font';
                            style.textContent = ${org.json.JSONObject.quote(css)};
                            document.head.appendChild(style);
                            if (document.fonts && document.fonts.load) {
                                document.fonts.load("64px SevenDaysEmbedded");
                            }
                        })();
                    """.trimIndent()

                    view?.evaluateJavascript(js, null)
                }
            }
        }

        setContentView(webView)
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    private fun applyOrientationMode(mode: String) {
        requestedOrientation = when (mode.lowercase()) {
            "portrait" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT
            "landscape" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            else -> ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
        }
    }
}
