package br.com.vocalis.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Base64
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.webkit.WebViewAssetLoader
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var pendingWebPermissionRequest: PermissionRequest? = null

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val micGranted = results[Manifest.permission.RECORD_AUDIO] == true
        pendingWebPermissionRequest?.let { req ->
            if (micGranted) {
                req.grant(req.resources)
            } else {
                req.deny()
            }
            pendingWebPermissionRequest = null
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        createNotificationChannel()
        requestEssentialPermissions()

        webView = WebView(this)
        setContentView(webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = WebSettings.LOAD_DEFAULT
            setSupportZoom(false)
        }

        webView.addJavascriptInterface(VocalisAndroidBridge(), "VocalisAndroid")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url.toString()
                // Mantém rotas internas do app e embeds YouTube dentro do app; abre links externos no app nativo
                if (url.startsWith("https://appassets.androidplatform.net/")) {
                    return false
                }
                if (url.contains("youtube.com/embed/") || url.contains("youtube-nocookie.com/embed/")) {
                    return false
                }
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    true
                } catch (_: Exception) {
                    false
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                val resources = request.resources
                if (resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                    val hasMic = ContextCompat.checkSelfPermission(
                        this@MainActivity,
                        Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED

                    if (hasMic) {
                        request.grant(resources)
                    } else {
                        pendingWebPermissionRequest = request
                        permissionLauncher.launch(arrayOf(Manifest.permission.RECORD_AUDIO))
                    }
                } else {
                    request.grant(resources)
                }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        // Carrega os assets locais empacotados via npm run android:sync
        // Para apontar para um servidor em produção, altere para a URL HTTPS do servidor Vocalis
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
    }

    private fun requestEssentialPermissions() {
        val needed = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED
        ) {
            needed.add(Manifest.permission.RECORD_AUDIO)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            needed.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        if (needed.isNotEmpty()) {
            permissionLauncher.launch(needed.toTypedArray())
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = getString(R.string.notification_channel_id)
            val name = getString(R.string.notification_channel_name)
            val channel = NotificationChannel(
                channelId,
                name,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Lembretes diários de exercícios e higiene vocal do Vocalis"
                enableVibration(true)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    inner class VocalisAndroidBridge {

        @JavascriptInterface
        fun getAppVersion(): String = "1.0.0-android"

        @JavascriptInterface
        fun vibrate(ms: Int) {
            val duration = ms.coerceIn(10, 1000).toLong()
            runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                        vm.defaultVibrator.vibrate(
                            VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE)
                        )
                    } else {
                        @Suppress("DEPRECATION")
                        val v = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            v.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
                        } else {
                            @Suppress("DEPRECATION")
                            v.vibrate(duration)
                        }
                    }
                } catch (_: Exception) {
                }
            }
        }

        @JavascriptInterface
        fun keepScreenOn(enabled: Boolean) {
            runOnUiThread {
                if (enabled) {
                    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }
        }

        @JavascriptInterface
        fun showNotification(title: String, body: String) {
            val channelId = getString(R.string.notification_channel_id)
            val intent = Intent(this@MainActivity, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                this@MainActivity,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(this@MainActivity, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                NotificationManagerCompat.from(this@MainActivity)
                    .notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notification)
            }
        }

        @JavascriptInterface
        fun sharePdfBase64(base64Data: String, filename: String, title: String) {
            try {
                val cleanName = filename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
                val reportsDir = File(cacheDir, "reports").apply { mkdirs() }
                val pdfFile = File(reportsDir, cleanName)
                val bytes = Base64.decode(base64Data, Base64.DEFAULT)
                FileOutputStream(pdfFile).use { it.write(bytes) }

                val uri = FileProvider.getUriForFile(
                    this@MainActivity,
                    "${applicationContext.packageName}.fileprovider",
                    pdfFile
                )

                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "application/pdf"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    putExtra(Intent.EXTRA_SUBJECT, title)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }

                runOnUiThread {
                    startActivity(Intent.createChooser(shareIntent, title))
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
