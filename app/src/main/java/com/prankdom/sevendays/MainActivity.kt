package com.prankdom.sevendays

import android.Manifest
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

class MainActivity : android.app.Activity() {
    private lateinit var webView: WebView
    private val allowedExternalPrefixes = listOf("https://github.com/LuckyNate/SevenDays")
    private val logoUrl = "https://appassets.androidplatform.net/assets/seven-days-logo.svg"

    inner class AppBridge {
        @JavascriptInterface
        fun landscape() {
            runOnUiThread {
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7001)
        }
        buildWebShell()
    }

    private fun buildWebShell() {
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.setSupportMultipleWindows(false)
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.loadsImagesAutomatically = true
            settings.mediaPlaybackRequiresUserGesture = true
            settings.safeBrowsingEnabled = true
            addJavascriptInterface(AppBridge(), "SevenDaysApp")

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?) =
                    request?.url?.let(assetLoader::shouldInterceptRequest)

                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString() ?: return true
                    if (url.startsWith("https://appassets.androidplatform.net/assets/")) return false
                    if (allowedExternalPrefixes.any(url::startsWith)) {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    }
                    return true
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    view?.evaluateJavascript(
                        """
                        (()=>{
                          const font = "'SevenDays', sans-serif";
                          const logo = "${logoUrl}";
                          document.documentElement.style.fontFamily = font;
                          document.body.style.fontFamily = font;
                          document.querySelectorAll('*').forEach(el => {
                            el.style.setProperty('font-family', font, 'important');
                          });

                          const mark=document.querySelector('.mark');
                          if(mark){
                            const img=document.createElement('img');
                            img.src=logo;
                            img.alt='SEVEN DAYS';
                            img.style.cssText='display:block;width:min(78vw,360px);height:auto;margin:0 auto 22px;filter:drop-shadow(0 0 16px rgba(180,0,0,.25))';
                            mark.replaceWith(img);
                          }

                          const count=document.getElementById('count');
                          if(count){
                            count.style.setProperty('font-family', font, 'important');
                            count.style.fontWeight='400';
                            count.style.fontSize='clamp(44px,12vw,86px)';
                            count.style.letterSpacing='.04em';
                          }

                          const opening=document.createElement('section');
                          opening.id='seven-days-opening';
                          opening.style.cssText='position:fixed;inset:0;z-index:9999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;text-align:center;opacity:1;transition:opacity .32s ease';
                          opening.innerHTML=`
                            <img src="${logoUrl}" alt="SEVEN DAYS" style="display:block;width:min(88vw,520px);height:auto;filter:drop-shadow(0 0 22px rgba(180,0,0,.32));">
                            <div style="margin-top:34px;font-family:SevenDays,sans-serif;font-size:clamp(18px,5vw,28px);letter-spacing:.16em;color:#b30000;">TAP TO BEGIN</div>
                          `;
                          document.body.appendChild(opening);

                          const leaveTitle=()=>{
                            if(window.SevenDaysApp && SevenDaysApp.landscape){ SevenDaysApp.landscape(); }
                            opening.style.opacity='0';
                            setTimeout(()=>opening.remove(),340);
                          };
                          opening.addEventListener('pointerdown',leaveTitle,{once:true});
                        })();
                        """.trimIndent(),
                        null
                    )
                }

                override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
                    view?.destroy()
                    recreate()
                    return true
                }
            }
        }

        setContentView(webView)
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }
}
