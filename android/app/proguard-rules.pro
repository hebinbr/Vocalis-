# Keep JavascriptInterface methods used by Vocalis WebView bridge
-keepclassmembers class br.com.vocalis.app.MainActivity$VocalisAndroidBridge {
    @android.webkit.JavascriptInterface <methods>;
}
