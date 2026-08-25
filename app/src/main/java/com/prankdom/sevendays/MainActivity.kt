package com.prankdom.sevendays

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.*
import androidx.webkit.WebViewAssetLoader

class MainActivity : android.app.Activity() {
    private lateinit var webView: WebView
    private val allowedExternalPrefixes = listOf("https://github.com/LuckyNate/SevenDays")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7001)
        buildWebShell()
    }

    private fun buildWebShell() {
        val assetLoader = WebViewAssetLoader.Builder().addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
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
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?) = request?.url?.let(assetLoader::shouldInterceptRequest)
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url=request?.url?.toString() ?: return true
                    if(url.startsWith("https://appassets.androidplatform.net/assets/")) return false
                    if(allowedExternalPrefixes.any(url::startsWith)) startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    return true
                }
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view,url)
                    view?.evaluateJavascript("""
                        (()=>{
                          const mark=document.querySelector('.mark');
                          if(mark){
                            const img=document.createElement('img');
                            img.src='seven-days-logo.svg'; img.alt='SEVEN DAYS';
                            img.style.cssText='display:block;width:min(78vw,360px);height:auto;margin:0 auto 22px;filter:drop-shadow(0 0 16px rgba(180,0,0,.25))';
                            mark.replaceWith(img);
                          }
                          const count=document.getElementById('count');
                          if(count){count.style.fontFamily='monospace';count.style.fontWeight='700';count.style.fontSize='clamp(34px,10vw,62px)';count.style.letterSpacing='.04em';}
                        })();
                    """.trimIndent(), null)
                }
                override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean { view?.destroy(); recreate(); return true }
            }
        }
        setContentView(webView)
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    override fun onDestroy(){ if(::webView.isInitialized){webView.stopLoading();webView.destroy()}; super.onDestroy() }
}
