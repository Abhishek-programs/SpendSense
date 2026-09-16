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
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import {{PACKAGE}}.R

class PaymentWatchService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var lastTarget: String? = null
  private var eventCursor = 0L
  private var lastUiKind: String? = null
  private var waitingForDelay = false
  private var nonTargetSince = 0L

  private val showLogLater = Runnable {
    waitingForDelay = false
    publishWatchUi()
  }

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
    startAsForeground(placeholderNotification())
    applyServiceMode()
    val prev = lastTarget
    refreshTarget()
    onTargetChanged(prev, lastTarget)
    publishWatchUi()
    handler.post(poll)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (!PaymentWatchPrefs.isEnabled(this) || !PaymentWatchAccess.hasUsageAccess(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    startAsForeground(
      if (PaymentWatchPrefs.persistentHelper(this)) {
        desiredNotification() ?: placeholderNotification()
      } else {
        placeholderNotification()
      },
    )
    if (intent?.action == ACTION_RECONFIGURE) {
      val wasWaiting = waitingForDelay
      handler.removeCallbacks(showLogLater)
      waitingForDelay = false
      nonTargetSince = 0L
      val currentTarget = lastTarget
      if (currentTarget != null && currentTarget !in PaymentWatchPrefs.targetPackages(this)) {
        lastTarget = null
        PaymentWatchPrefs.setDoneThisVisit(this, false)
      } else if (wasWaiting && currentTarget != null) {
        waitingForDelay = true
        handler.postDelayed(showLogLater, PaymentWatchPrefs.logDelayMs(this))
      }
    }
    applyServiceMode()
    val prev = lastTarget
    refreshTarget()
    onTargetChanged(prev, lastTarget)
    publishWatchUi()
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(poll)
    handler.removeCallbacks(showLogLater)
    getSystemService(NotificationManager::class.java)?.apply {
      cancel(NOTIF_ID)
      cancel(LOG_NOTIF_ID)
    }
    super.onDestroy()
  }

  private fun tick() {
    if (!PaymentWatchPrefs.isEnabled(this) || !PaymentWatchAccess.hasUsageAccess(this)) {
      stopSelf()
      return
    }
    val prev = lastTarget
    refreshTarget()
    onTargetChanged(prev, lastTarget)
    val kind = uiKind()
    if (kind != lastUiKind) publishWatchUi()
  }

  private fun onTargetChanged(prev: String?, current: String?) {
    if (prev == current) return
    handler.removeCallbacks(showLogLater)
    waitingForDelay = false
    if (current == null) {
      PaymentWatchPrefs.setDoneThisVisit(this, false)
      return
    }
    if (prev != null) PaymentWatchPrefs.setDoneThisVisit(this, false)
    waitingForDelay = true
    handler.postDelayed(showLogLater, PaymentWatchPrefs.logDelayMs(this))
  }

  private var foregroundPkg: String? = null

  private fun refreshTarget() {
    val fg = applyForegroundEvents()
    val target = fg?.takeIf { it in PaymentWatchPrefs.targetPackages(this) }
    if (target != null) {
      nonTargetSince = 0L
      lastTarget = target
      return
    }
    if (lastTarget == null) return
    val now = System.currentTimeMillis()
    if (nonTargetSince == 0L) nonTargetSince = now
    if (now - nonTargetSince >= EXIT_GRACE_MS) {
      nonTargetSince = 0L
      lastTarget = null
    }
  }

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
      if (isResume && !isTransientForeground(event.packageName)) {
        foregroundPkg = event.packageName
      }
    }
    eventCursor = end
    return foregroundPkg
  }

  private fun isTransientForeground(packageName: String): Boolean {
    if (packageName == "com.android.systemui") return true
    val inputMethod = Settings.Secure.getString(
      contentResolver,
      Settings.Secure.DEFAULT_INPUT_METHOD,
    ).orEmpty().substringBefore('/')
    return packageName == inputMethod
  }

  private fun publishWatchUi() {
    lastUiKind = uiKind()
    val nm = getSystemService(NotificationManager::class.java)
    val notification = desiredNotification()
    if (PaymentWatchPrefs.persistentHelper(this)) {
      nm?.cancel(LOG_NOTIF_ID)
      startAsForeground(notification ?: placeholderNotification())
    } else if (notification != null) {
      nm?.notify(LOG_NOTIF_ID, notification)
    } else if (!PaymentWatchPrefs.shouldHoldCancel(this)) {
      nm?.cancel(LOG_NOTIF_ID)
    }
  }

  private fun uiKind(): String {
    if (PaymentWatchPrefs.pendingTxn(this) != null) return "category"
    if (lastTarget == null || PaymentWatchPrefs.doneThisVisit(this) || waitingForDelay) return "none"
    return "log"
  }

  private fun desiredNotification(): Notification? {
    val pending = PaymentWatchPrefs.pendingTxn(this)
    if (pending != null) return categoryNotification(pending)
    if (lastTarget == null) return null
    if (PaymentWatchPrefs.doneThisVisit(this)) return null
    if (waitingForDelay) return null
    return logNotification(lastTarget!!)
  }

  private fun demoteFromForeground() {
    if (Build.VERSION.SDK_INT >= 24) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    getSystemService(NotificationManager::class.java)?.cancel(NOTIF_ID)
  }

  private fun applyServiceMode() {
    if (PaymentWatchPrefs.persistentHelper(this)) {
      startAsForeground(desiredNotification() ?: placeholderNotification())
    } else {
      demoteFromForeground()
    }
  }

  private fun startAsForeground(notification: Notification) {
    try {
      if (Build.VERSION.SDK_INT >= 34) {
        startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } else {
        startForeground(NOTIF_ID, notification)
      }
    } catch (_: Exception) {
      // Android 12+ forbids promoting a backgrounded service to FGS from a Handler.
    }
  }

  private fun ensureChannels() {
    if (Build.VERSION.SDK_INT < 26) return
    val nm = getSystemService(NotificationManager::class.java) ?: return
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL_IDLE, "Payment helper", NotificationManager.IMPORTANCE_MIN).apply {
        setShowBadge(false)
        setSound(null, null)
        enableLights(false)
        enableVibration(false)
      },
    )
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL_LOG, "Log a payment", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Type an amount while eSewa or nBank is open, then pick a bucket."
      },
    )
  }

  private fun placeholderNotification(): Notification {
    return NotificationCompat.Builder(this, CHANNEL_IDLE)
      .setSmallIcon(R.drawable.ic_stat_spendsense)
      .setContentTitle("SpendSense")
      .setContentText("Payment helper")
      .setOngoing(true)
      .setSilent(true)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .build()
  }

  private fun categoryNotification(pending: PaymentWatchPrefs.PendingTxn): Notification {
    val npr = pending.amount.toInt()
    val title = "NPR $npr · ${pending.merchant}"
    val bucketInput = RemoteInput.Builder(KEY_BUCKET)
      .setLabel("Choose bucket")
      .setChoices(PaymentWatchDb.spendingBucketNames(this))
      .setAllowFreeFormInput(true)
      .build()
    val assignIntent = Intent(this, PaymentWatchReceiver::class.java).apply {
      action = ACTION_ASSIGN
      putExtra(EXTRA_TXN_ID, pending.id)
    }
    val assignPending = PendingIntent.getBroadcast(
      this,
      pending.id.hashCode(),
      assignIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
    )
    val choose = NotificationCompat.Action.Builder(
      android.R.drawable.ic_menu_save,
      "Choose bucket",
      assignPending,
    ).addRemoteInput(bucketInput).build()
    val pickIntent = Intent(this, PaymentWatchPickActivity::class.java).apply {
      putExtra(PaymentWatchPickActivity.EXTRA_TXN_ID, pending.id)
      putExtra(PaymentWatchPickActivity.EXTRA_AMOUNT, pending.amount)
      putExtra(PaymentWatchPickActivity.EXTRA_MERCHANT, pending.merchant)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val pickPending = PendingIntent.getActivity(
      this,
      pending.id.hashCode(),
      pickIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    return NotificationCompat.Builder(this, CHANNEL_LOG)
      .setSmallIcon(R.drawable.ic_stat_spendsense)
      .setContentTitle(title)
      .setContentText("Tap to choose any Living bucket")
      .setContentIntent(pickPending)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .addAction(choose)
      .build()
  }

  private fun logNotification(packageName: String): Notification {
    val label = PaymentWatchPrefs.merchantLabel(this, packageName)
    val amountInput = RemoteInput.Builder(KEY_AMOUNT)
      .setLabel("400 momo")
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
    ).addRemoteInput(amountInput).build()

    return NotificationCompat.Builder(this, CHANNEL_LOG)
      .setSmallIcon(R.drawable.ic_stat_spendsense)
      .setContentTitle("Log $label payment")
      .setContentText("Amount then a name, e.g. 200 momo")
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .addAction(action)
      .build()
  }

  companion object {
    const val NOTIF_ID = 7101
    const val LOG_NOTIF_ID = 7102
    const val CHANNEL_IDLE = "payment_watch_idle"
    const val CHANNEL_LOG = "payment_watch_log"
    const val ACTION_LOG = "{{PACKAGE}}.paymentwatch.LOG"
    const val ACTION_ASSIGN = "{{PACKAGE}}.paymentwatch.ASSIGN"
    const val ACTION_RECONFIGURE = "{{PACKAGE}}.paymentwatch.RECONFIGURE"
    const val KEY_AMOUNT = "payment_watch_amount"
    const val KEY_BUCKET = "payment_watch_bucket"
    const val EXTRA_PACKAGE = "payment_watch_package"
    const val EXTRA_TXN_ID = "payment_watch_txn_id"
    private const val POLL_MS = 1500L
    private const val EXIT_GRACE_MS = 3000L

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

    fun reconfigure(context: Context) {
      if (!PaymentWatchPrefs.isEnabled(context) || !PaymentWatchAccess.hasUsageAccess(context)) return
      val intent = Intent(context, PaymentWatchService::class.java).apply {
        action = ACTION_RECONFIGURE
      }
      if (Build.VERSION.SDK_INT >= 26) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun clearLogUi(context: Context) {
      if (PaymentWatchPrefs.persistentHelper(context)) {
        start(context)
        return
      }
      val nm = context.getSystemService(NotificationManager::class.java) ?: return
      PaymentWatchPrefs.holdCancelUntil(context, System.currentTimeMillis() + 2500)
      val done = NotificationCompat.Builder(context, CHANNEL_LOG)
        .setSmallIcon(R.drawable.ic_stat_spendsense)
        .setContentTitle("Saved")
        .setContentText("Bucket updated")
        .setRemoteInputHistory(arrayOf("Saved"))
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setOngoing(false)
        .setAutoCancel(true)
        .setTimeoutAfter(1500)
        .setPriority(NotificationCompat.PRIORITY_MIN)
        .build()
      nm.notify(LOG_NOTIF_ID, done)
    }
  }
}
