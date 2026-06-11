package com.anonymous.SpendSense.overlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class OverlayService : Service() {

  private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
  private var windowManager: WindowManager? = null
  private var bubbleView: FloatingBubbleView? = null
  private var captureManager: ScreenCaptureManager? = null
  private var ocrProcessor: MLKitOCRProcessor? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    ocrProcessor = MLKitOCRProcessor()
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> startOverlay()
      ACTION_STOP -> stopOverlay()
    }
    return START_STICKY
  }

  private fun startOverlay() {
    val projection = OverlayModuleHolder.mediaProjection
    if (projection == null) {
      stopSelf()
      return
    }

    startForeground(NOTIFICATION_ID, buildNotification())

    if (bubbleView != null) return

    val wm = windowManager ?: return
    captureManager = ScreenCaptureManager(this, projection, wm)

    bubbleView = FloatingBubbleView(this, wm) {
      serviceScope.launch {
        runCapturePipeline()
      }
    }.also { it.attach() }
  }

  private suspend fun runCapturePipeline() {
    val manager = captureManager ?: return
    val processor = ocrProcessor ?: return

    val bitmap = manager.capture() ?: return
    try {
      val rawText = processor.process(bitmap)
      if (rawText.isNotBlank()) {
        OcrResultBridge.emitResult(rawText)
      }
    } finally {
      if (!bitmap.isRecycled) {
        bitmap.recycle()
      }
    }
  }

  private fun stopOverlay() {
    bubbleView?.detach()
    bubbleView = null
    captureManager = null
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  override fun onDestroy() {
    bubbleView?.detach()
    bubbleView = null
    captureManager = null
    ocrProcessor?.close()
    ocrProcessor = null
    serviceScope.cancel()
    super.onDestroy()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "SpendSense Overlay",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Shows while the scan bubble is active"
      setShowBadge(false)
    }
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.createNotificationChannel(channel)
  }

  private fun buildNotification(): Notification {
    val stopIntent = Intent(this, OverlayService::class.java).apply { action = ACTION_STOP }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("SpendSense")
      .setContentText("Tap the bubble to capture a transaction")
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
  }

  companion object {
    const val ACTION_START = "com.anonymous.SpendSense.overlay.START"
    const val ACTION_STOP = "com.anonymous.SpendSense.overlay.STOP"
    private const val CHANNEL_ID = "spendsense_overlay"
    private const val NOTIFICATION_ID = 9001
  }
}
