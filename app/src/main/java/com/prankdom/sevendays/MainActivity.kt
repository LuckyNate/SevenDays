package com.prankdom.sevendays

import android.Manifest
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

class MainActivity : android.app.Activity() {
    private lateinit var webView: WebView
    private val allowedExternalPrefixes = listOf("https://github.com/LuckyNate/SevenDays")

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

        val fontBase64 = assets.open("fonts/SevenDays-Regular.ttf").use {
            Base64.encodeToString(it.readBytes(), Base64.NO_WRAP)
        }
        val logoSvg = assets.open("seven-days-logo.svg").bufferedReader().use { it.readText() }
        val logoJs = JSONObject.quote(logoSvg)

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
                    val js = """
                        (()=>{
                          if(document.getElementById('seven-days-native-style')) return;

                          const style=document.createElement('style');
                          style.id='seven-days-native-style';
                          style.textContent=`@font-face{font-family:'SevenDays';src:url(data:font/ttf;base64,$fontBase64) format('truetype');font-weight:400;font-style:normal;font-display:block}html,body,body *{font-family:'SevenDays',sans-serif!important}`;
                          document.head.appendChild(style);

                          const logoSvg=$logoJs;
                          const makeLogo=(width,margin)=>{
                            const box=document.createElement('div');
                            box.innerHTML=logoSvg;
                            const svg=box.querySelector('svg');
                            if(svg){
                              svg.style.cssText=`display:block;width:${'$'}{width};height:auto;margin:${'$'}{margin};filter:drop-shadow(0 0 18px rgba(180,0,0,.3))`;
                              svg.setAttribute('aria-label','SEVEN DAYS');
                            }
                            return box.firstElementChild || box;
                          };

                          const install=()=>{
                            document.documentElement.style.fontFamily="'SevenDays',sans-serif";
                            document.body.style.fontFamily="'SevenDays',sans-serif";

                            const mark=document.querySelector('.mark');
                            if(mark) mark.replaceWith(makeLogo('min(78vw,360px)','0 auto 22px'));

                            const count=document.getElementById('count');
                            if(count){
                              count.style.setProperty('font-family',"'SevenDays',sans-serif",'important');
                              count.style.fontWeight='400';
                              count.style.fontSize='clamp(44px,12vw,86px)';
                              count.style.letterSpacing='.04em';
                            }

                            const opening=document.createElement('section');
                            opening.id='seven-days-opening';
                            opening.style.cssText='position:fixed;inset:0;z-index:9999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;text-align:center;opacity:1;transition:opacity .32s ease';
                            opening.appendChild(makeLogo('min(88vw,520px)','0'));
                            const prompt=document.createElement('div');
                            prompt.textContent='TAP TO BEGIN';
                            prompt.style.cssText="margin-top:34px;font-family:'SevenDays',sans-serif;font-size:clamp(18px,5vw,28px);letter-spacing:.16em;color:#b30000";
                            opening.appendChild(prompt);
                            document.body.appendChild(opening);

                            const leaveTitle=()=>{
                              if(window.SevenDaysApp && SevenDaysApp.landscape) SevenDaysApp.landscape();
                              opening.style.opacity='0';
                              setTimeout(()=>opening.remove(),340);
                            };
                            opening.addEventListener('pointerdown',leaveTitle,{once:true});
                          };

                          if(document.fonts && document.fonts.load){
                            document.fonts.load("32px SevenDays").then(install).catch(install);
                          } else install();
                        })();
                    """.trimIndent()
                    view?.evaluateJavascript(js, null)
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
