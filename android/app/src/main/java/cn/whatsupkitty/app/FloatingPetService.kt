package cn.whatsupkitty.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import kotlin.math.abs
import kotlin.random.Random

class FloatingPetService : Service() {

    private lateinit var wm: WindowManager
    private var webView: WebView? = null
    private lateinit var params: WindowManager.LayoutParams
    private val handler = Handler(Looper.getMainLooper())
    private var added = false
    private var paused = false

    // 漫游状态
    private enum class Phase { IDLE, WALK_L, WALK_R, GROOM }
    private var phase = Phase.IDLE
    private var phaseTicksLeft = 0
    private var screenW = 0

    // 收敛
    private var lastConverged = false
    private var riskCheckAccumMs = 0

    // 触摸
    private var downX = 0f; private var downY = 0f
    private var startWinX = 0; private var startWinY = 0
    private var dragging = false
    private var downAt = 0L
    private val longPress = Runnable { hideAndStop() }

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) {
            when (i?.action) {
                Intent.ACTION_SCREEN_OFF -> { paused = true; webView?.onPause(); evalGait("nap") }
                Intent.ACTION_SCREEN_ON -> { paused = false; webView?.onResume() }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        screenW = resources.displayMetrics.widthPixels
        // Android 14+ 动态注册 receiver 须显式 exported flag;只听系统亮灭屏广播,用 NOT_EXPORTED。
        ContextCompat.registerReceiver(
            this,
            screenReceiver,
            IntentFilter().apply {
                addAction(Intent.ACTION_SCREEN_OFF); addAction(Intent.ACTION_SCREEN_ON)
            },
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_HIDE -> { hideAndStop(); return START_NOT_STICKY }
            else -> showOverlay() // ACTION_SHOW 或被系统重启(intent=null)
        }
        return START_STICKY
    }

    private fun startForegroundNotif() {
        val chId = "floating_pet"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(chId) == null) {
                nm.createNotificationChannel(
                    NotificationChannel(chId, "桌面桌宠", NotificationManager.IMPORTANCE_MIN),
                )
            }
        }
        val notif: Notification = Notification.Builder(this, chId)
            .setContentTitle("小猫在桌面陪着你")
            .setContentText("点设置可收回")
            .setSmallIcon(applicationInfo.icon)
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIF_ID, notif)
        }
    }

    private fun showOverlay() {
        startForegroundNotif()
        if (added) return
        isRunning = true

        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("localhost")
            .setHttpAllowed(false)
            .addPathHandler("/", PublicAssetsHandler(this))
            .build()

        val wv = WebView(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    assetLoader.shouldInterceptRequest(request.url)
            }
            setOnTouchListener { _, e -> onTouch(e) }
            // 静态导出产物:out/floating-pet.html;PublicAssetsHandler 候选含 public/$clean.html 兜底
            loadUrl("https://localhost/floating-pet/")
        }
        webView = wv

        val type =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
        params = WindowManager.LayoutParams(
            dp(120), dp(150), type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = dp(40); y = dp(320)
        }
        wm.addView(wv, params)
        added = true
        handler.postDelayed(roam, ROAM_INTERVAL_MS)
    }

    // ---- 漫游循环:移动小窗口 + 推步态给 WebView ----
    private val roam = object : Runnable {
        override fun run() {
            if (added && !paused) {
                checkRisk()
                if (!lastConverged) stepRoam()
            }
            handler.postDelayed(this, ROAM_INTERVAL_MS)
        }
    }

    private fun stepRoam() {
        if (phaseTicksLeft <= 0) pickPhase()
        phaseTicksLeft--
        when (phase) {
            Phase.WALK_L -> moveWindow(-WALK_STEP_PX)
            Phase.WALK_R -> moveWindow(WALK_STEP_PX)
            else -> {}
        }
    }

    private fun pickPhase() {
        // 简单随机:idle / 左走 / 右走 / 洗脸。靠边则回头。
        val atLeft = params.x <= dp(8)
        val atRight = params.x >= screenW - dp(128)
        phase = when (Random.nextInt(100)) {
            in 0..44 -> Phase.IDLE
            in 45..69 -> if (atRight) Phase.WALK_L else Phase.WALK_R
            in 70..94 -> if (atLeft) Phase.WALK_R else Phase.WALK_L
            else -> Phase.GROOM
        }
        phaseTicksLeft = when (phase) {
            Phase.IDLE -> 60 + Random.nextInt(60)   // ~2.4–4.8s
            Phase.GROOM -> 80
            else -> 40 + Random.nextInt(40)         // 走一段
        }
        evalGait(
            when (phase) {
                Phase.IDLE -> "idle"
                Phase.GROOM -> "groom"
                Phase.WALK_L -> "running-left"
                Phase.WALK_R -> "running-right"
            },
        )
    }

    private fun moveWindow(dx: Int) {
        if (!added) return
        params.x = (params.x + dx).coerceIn(dp(4), screenW - dp(124))
        wm.updateViewLayout(webView, params)
    }

    // ---- 风险收敛:轮询 SharedPreferences ----
    private fun checkRisk() {
        riskCheckAccumMs += ROAM_INTERVAL_MS.toInt()
        if (riskCheckAccumMs < RISK_POLL_MS) return
        riskCheckAccumMs = 0
        val sp = getSharedPreferences(FloatingPetPlugin.PREFS, Context.MODE_PRIVATE)
        val level = sp.getString("risk_level", null)
        val ts = sp.getLong("risk_ts", 0L)
        val converged = level != null && (System.currentTimeMillis() - ts) < CONVERGE_WINDOW_MS
        if (converged != lastConverged) {
            lastConverged = converged
            evalConverged(converged)
            if (converged) { phase = Phase.IDLE; phaseTicksLeft = Int.MAX_VALUE }
            else { phaseTicksLeft = 0 }
        }
    }

    // ---- 触摸:点(切回/导向就医)/ 拖 / 长按收回 ----
    private fun onTouch(e: MotionEvent): Boolean {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downX = e.rawX; downY = e.rawY
                startWinX = params.x; startWinY = params.y
                dragging = false; downAt = System.currentTimeMillis()
                handler.postDelayed(longPress, LONG_PRESS_MS)
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = e.rawX - downX; val dy = e.rawY - downY
                if (!dragging && (abs(dx) > TOUCH_SLOP || abs(dy) > TOUCH_SLOP)) {
                    dragging = true; handler.removeCallbacks(longPress)
                }
                if (dragging) {
                    params.x = (startWinX + dx.toInt()).coerceIn(0, screenW - dp(120))
                    params.y = (startWinY + dy.toInt()).coerceAtLeast(0)
                    wm.updateViewLayout(webView, params)
                }
                return true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                handler.removeCallbacks(longPress)
                val quick = System.currentTimeMillis() - downAt < LONG_PRESS_MS
                if (!dragging && quick) onTap()
                return true
            }
        }
        return false
    }

    private fun onTap() {
        if (lastConverged) {
            // 收敛态:不诱导玩,直接打开 App(用户去看红黄报告/就医引导)。
            openApp()
        } else {
            evalReact()        // 卖萌挥手
            openApp()          // 点猫切回 App
        }
    }

    private fun openApp() {
        val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        }
        if (launch != null) startActivity(launch)
    }

    // ---- JS 桥 ----
    private fun evalGait(s: String) = eval("window.__fpGait && window.__fpGait('$s')")
    private fun evalReact() = eval("window.__fpReact && window.__fpReact()")
    private fun evalConverged(c: Boolean) = eval("window.__fpConverged && window.__fpConverged($c)")
    private fun eval(js: String) {
        val wv = webView ?: return
        wv.post { wv.evaluateJavascript(js, null) }
    }

    private fun hideAndStop() {
        handler.removeCallbacks(roam)
        if (added) { runCatching { wm.removeView(webView) }; added = false }
        webView?.destroy(); webView = null
        isRunning = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        runCatching { unregisterReceiver(screenReceiver) }
        if (added) runCatching { wm.removeView(webView) }
        webView?.destroy(); webView = null
        isRunning = false
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    // 把导出的静态站(assets/public)以 https://localhost 供给悬浮 WebView。
    // 候选顺序:public/$clean → public/$clean/index.html → public/$clean.html
    // floating-pet 命中第三候选:public/floating-pet.html(即 out/floating-pet.html 同步进来的)
    private class PublicAssetsHandler(private val ctx: Context) : WebViewAssetLoader.PathHandler {
        override fun handle(path: String): WebResourceResponse? {
            val clean = path.trim('/')
            val candidates = listOf("public/$clean", "public/$clean/index.html", "public/$clean.html")
            for (cand in candidates) {
                try {
                    val stream = ctx.assets.open(cand)
                    return WebResourceResponse(mime(cand), null, stream)
                } catch (_: Exception) { /* 试下一个 */ }
            }
            return null
        }
        private fun mime(p: String): String = when {
            p.endsWith(".html") -> "text/html"
            p.endsWith(".js") -> "application/javascript"
            p.endsWith(".css") -> "text/css"
            p.endsWith(".webp") -> "image/webp"
            p.endsWith(".png") -> "image/png"
            p.endsWith(".jpg") || p.endsWith(".jpeg") -> "image/jpeg"
            p.endsWith(".svg") -> "image/svg+xml"
            p.endsWith(".json") -> "application/json"
            p.endsWith(".woff2") -> "font/woff2"
            else -> "application/octet-stream"
        }
    }

    companion object {
        const val ACTION_SHOW = "cn.whatsupkitty.app.SHOW_PET"
        const val ACTION_HIDE = "cn.whatsupkitty.app.HIDE_PET"
        private const val NOTIF_ID = 4711
        private const val ROAM_INTERVAL_MS = 40L
        private const val RISK_POLL_MS = 1000
        private const val WALK_STEP_PX = 3
        private const val LONG_PRESS_MS = 600L
        private const val TOUCH_SLOP = 24f
        // ⚠️ 与 src/lib/risk-flag.ts 的 CONVERGE_WINDOW_MS 必须一致(6h)。
        private const val CONVERGE_WINDOW_MS = 6L * 60 * 60 * 1000
        @Volatile var isRunning = false
    }
}
