package {{PACKAGE}}.paymentwatch

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput

class PaymentWatchService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var lastTarget: String? = null
  private var eventCursor = 0L

  private val poll = object : Runnable {
    override fun run() {
      tick()
      handler.postDelayed(this, POLL_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    eventCursor = 0L
    ensureChannels()
    startAsForeground(idleNotification())
    handler.post(poll)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (!PaymentWatchPrefs.isEnabled(this) || !PaymentWatchAccess.hasUsageAccess(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    startAsForeground(currentNotification())
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(poll)
    super.onDestroy()
  }

  private fun tick() {
    if (!PaymentWatchPrefs.isEnabled(this) || !PaymentWatchAccess.hasUsageAccess(this)) {
      stopSelf()
      return
    }
    val fg = applyForegroundEvents()
    val targets = PaymentWatchPrefs.targetPackages(this)
    val hit = fg?.takeIf { it in targets }
    if (hit != lastTarget) {
      lastTarget = hit
      startAsForeground(currentNotification())
    }
  }

  private var foregroundPkg: String? = null

  private fun applyForegroundEvents(): String? {
    val usm = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return foregroundPkg
    val end = System.currentTimeMillis()
    val start = if (eventCursor == 0L) end - 120_000 else eventCursor - 1_000
    val events = usm.queryEvents(start, end)
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (eventCursor != 0L && event.timeStamp < eventCursor) continue
      val isResume =
        event.eventType == UsageEvents.Event.ACTIVITY_RESUMED ||
          event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND
      if (isResume) foregroundPkg = event.packageName
    }
    eventCursor = end
    return foregroundPkg
  }

  private fun currentNotification(): Notification {
    val pkg = lastTarget
    return if (pkg != null) logNotification(pkg) else idleNotification()
  }

  private fun startAsForeground(notification: Notification) {
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIF_ID, notification)
    }
  }

  private fun ensureChannels() {
    if (Build.VERSION.SDK_INT < 26) return
    val nm = getSystemService(NotificationManager::class.java) ?: return
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL_IDLE, "Payment helper", NotificationManager.IMPORTANCE_MIN).apply {
        setShowBadge(false)
        description = "Keeps SpendSense ready to log payments. No screen recording."
      },
    )
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL_LOG, "Log a payment", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Type an amount while eSewa or nBank is open."
      },
    )
  }

  private fun idleNotification(): Notification {
    return NotificationCompat.Builder(this, CHANNEL_IDLE)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle("SpendSense")
      .setContentText("Payment helper on — no screen recording")
      .setOngoing(true)
      .setSilent(true)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .build()
  }

  private fun logNotification(packageName: String): Notification {
    val label = PaymentWatchPrefs.merchantLabel(packageName)
    val remoteInput = RemoteInput.Builder(KEY_AMOUNT)
      .setLabel("Amount (NPR)")
      .build()
    val replyIntent = Intent(this, PaymentWatchReceiver::class.java).apply {
      action = ACTION_LOG
      putExtra(EXTRA_PACKAGE, packageName)
    }
    val replyPending = PendingIntent.getBroadcast(
      this,
      packageName.hashCode(),
      replyIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
    )
    val action = NotificationCompat.Action.Builder(
      android.R.drawable.ic_menu_save,
      "Log",
      replyPending,
    ).addRemoteInput(remoteInput).build()

    return NotificationCompat.Builder(this, CHANNEL_LOG)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle("Log $label payment")
      .setContentText("Type the amount in NPR — category later in SpendSense")
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .addAction(action)
      .build()
  }

  companion object {
    const val NOTIF_ID = 7101
    const val CHANNEL_IDLE = "payment_watch_idle"
    const val CHANNEL_LOG = "payment_watch_log"
    const val ACTION_LOG = "{{PACKAGE}}.paymentwatch.LOG"
    const val KEY_AMOUNT = "payment_watch_amount"
    const val EXTRA_PACKAGE = "payment_watch_package"
    private const val POLL_MS = 1500L

    fun start(context: Context) {
      if (!PaymentWatchPrefs.isEnabled(context) || !PaymentWatchAccess.hasUsageAccess(context)) return
      val intent = Intent(context, PaymentWatchService::class.java)
      if (Build.VERSION.SDK_INT >= 26) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, PaymentWatchService::class.java))
    }
  }
}
