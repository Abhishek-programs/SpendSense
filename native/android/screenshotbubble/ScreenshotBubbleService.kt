package com.screenshotbubble

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.View
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicBoolean

class ScreenshotBubbleService : Service() {

  private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
  private val mainHandler = Handler(Looper.getMainLooper())
  private val isCapturing = AtomicBoolean(false)

  private var windowManager: WindowManager? = null
  private var bubbleView: BubbleOverlayView? = null
  private var mediaProjection: MediaProjection? = null
  private var projectionCallback: MediaProjection.Callback? = null
  private var usagePollJob: Job? = null

  private var whitelistedApps: List<String> = emptyList()
  private var ownPackage: String? = null

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopBubble()
        return START_NOT_STICKY
      }

      ACTION_START -> {
        val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0)
        val projectionData = intent.getProjectionIntent()
        val whitelist = intent.getStringArrayListExtra(EXTRA_WHITELIST)
        ownPackage = intent.getStringExtra(EXTRA_OWN_PACKAGE)

        if (projectionData == null) {
          stopSelf()
          return START_NOT_STICKY
        }

        whitelistedApps = buildList {
          whitelist?.let { addAll(it) }
          ownPackage?.takeIf { !contains(it) }?.let { add(it) }
        }

        startForeground(NOTIFICATION_ID, buildNotification())
        initMediaProjection(resultCode, projectionData)
        attachBubble()
        startUsagePolling()
      }
    }

    return START_STICKY
  }

  override fun onDestroy() {
    stopUsagePolling()
    detachBubble()
    releaseMediaProjection()
    serviceScope.cancel()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun initMediaProjection(resultCode: Int, projectionData: Intent) {
    releaseMediaProjection()

    val mgr = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    mediaProjection = mgr.getMediaProjection(resultCode, projectionData)

    projectionCallback = object : MediaProjection.Callback() {
      override fun onStop() {
        mainHandler.post { stopBubble() }
      }
    }
    mediaProjection?.registerCallback(projectionCallback!!, mainHandler)
  }

  private fun releaseMediaProjection() {
    mediaProjection?.let { projection ->
      projectionCallback?.let { projection.unregisterCallback(it) }
      projection.stop()
    }
    projectionCallback = null
    mediaProjection = null
  }

  private fun attachBubble() {
    if (bubbleView != null || windowManager == null) return

    val wm = windowManager ?: return
    bubbleView = BubbleOverlayView(
      this,
      wm,
      onCaptureRequested = { handleCaptureRequest() },
      onStopRequested = { stopBubble() },
    ).also { it.attach() }

    updateBubbleVisibility()
  }

  private fun detachBubble() {
    bubbleView?.detach()
    bubbleView = null
  }

  private fun startUsagePolling() {
    usagePollJob?.cancel()
    usagePollJob = serviceScope.launch {
      while (isActive) {
        updateBubbleVisibility()
        delay(USAGE_POLL_INTERVAL_MS)
      }
    }
  }

  private fun stopUsagePolling() {
    usagePollJob?.cancel()
    usagePollJob = null
  }

  private fun updateBubbleVisibility() {
    val topPackage = getTopPackageName()
    val visible = topPackage != null && (
      whitelistedApps.contains(topPackage) ||
        (ownPackage != null && ownPackage == topPackage)
      )

    mainHandler.post {
      if (bubbleView != null && !isCapturing.get()) {
        bubbleView?.visibility = if (visible) View.VISIBLE else View.GONE
      }
    }
  }

  private fun getTopPackageName(): String? {
    val usm = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
    val end = System.currentTimeMillis()
    val begin = end - 5000L
    val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, begin, end)
    if (stats.isNullOrEmpty()) return null
    return stats.maxByOrNull { it.lastTimeUsed }?.packageName
  }

  private fun handleCaptureRequest() {
    if (isCapturing.get() || mediaProjection == null || bubbleView == null) return

    serviceScope.launch {
      isCapturing.set(true)
      withContext(Dispatchers.Main) {
        bubbleView?.visibility = View.GONE
      }

      try {
        val projection = mediaProjection ?: return@launch
        val wm = windowManager ?: return@launch
        val path = ScreenCaptureHelper.captureToCache(this@ScreenshotBubbleService, projection, wm)
        if (path != null) {
          launchHeadlessOcrTask(path)
        }
      } finally {
        isCapturing.set(false)
        withContext(Dispatchers.Main) {
          updateBubbleVisibility()
        }
      }
    }
  }

  private fun launchHeadlessOcrTask(screenshotPath: String) {
    val intent = Intent(applicationContext, ScreenshotHeadlessTaskService::class.java).apply {
      putExtra(ScreenshotHeadlessTaskService.EXTRA_SCREENSHOT_PATH, screenshotPath)
    }
    applicationContext.startService(intent)
  }

  private fun stopBubble() {
    stopUsagePolling()
    detachBubble()
    releaseMediaProjection()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "SpendSense Scan Bubble",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Active while the scan bubble overlay is running"
      setShowBadge(false)
    }

    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.createNotificationChannel(channel)
  }

  private fun buildNotification(): Notification =
    NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("SpendSense")
      .setContentText("Scan bubble active — tap bubble to capture")
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()

  private fun Intent.getProjectionIntent(): Intent? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      getParcelableExtra(EXTRA_PROJECTION_DATA, Intent::class.java)
    } else {
      @Suppress("DEPRECATION")
      getParcelableExtra(EXTRA_PROJECTION_DATA)
    }

  companion object {
    const val ACTION_START = "com.screenshotbubble.START"
    const val ACTION_STOP = "com.screenshotbubble.STOP"
    const val EXTRA_RESULT_CODE = "resultCode"
    const val EXTRA_PROJECTION_DATA = "projectionData"
    const val EXTRA_WHITELIST = "whitelistedApps"
    const val EXTRA_OWN_PACKAGE = "ownPackage"

    private const val CHANNEL_ID = "spendsense_bubble"
    private const val NOTIFICATION_ID = 9002
    private const val USAGE_POLL_INTERVAL_MS = 1000L
  }
}
