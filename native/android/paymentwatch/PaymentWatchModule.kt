package {{PACKAGE}}.paymentwatch

import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class PaymentWatchModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  override fun getName(): String = "PaymentWatch"

  @ReactMethod
  fun isEnabled(promise: Promise) {
    promise.resolve(PaymentWatchPrefs.isEnabled(ctx))
  }

  @ReactMethod
  fun hasUsageAccess(promise: Promise) {
    promise.resolve(PaymentWatchAccess.hasUsageAccess(ctx))
  }

  @ReactMethod
  fun hasNotificationPermission(promise: Promise) {
    promise.resolve(NotificationManagerCompat.from(ctx).areNotificationsEnabled())
  }

  @ReactMethod
  fun getLogDelayMs(promise: Promise) {
    promise.resolve(PaymentWatchPrefs.logDelayMs(ctx).toDouble())
  }

  @ReactMethod
  fun setLogDelayMs(delayMs: Double, promise: Promise) {
    PaymentWatchPrefs.setLogDelayMs(ctx, delayMs.toLong())
    if (PaymentWatchPrefs.isEnabled(ctx)) PaymentWatchService.start(ctx)
    promise.resolve(true)
  }

  @ReactMethod
  fun setEnabled(enabled: Boolean, promise: Promise) {
    try {
      PaymentWatchPrefs.setEnabled(ctx, enabled)
      if (enabled) {
        if (!PaymentWatchAccess.hasUsageAccess(ctx)) {
          promise.resolve("needs_usage_access")
          return
        }
        PaymentWatchService.start(ctx)
      } else {
        PaymentWatchService.stop(ctx)
      }
      promise.resolve("ok")
    } catch (e: Exception) {
      promise.reject("watch_error", e)
    }
  }

  @ReactMethod
  fun openUsageAccessSettings(promise: Promise) {
    try {
      ctx.startActivity(PaymentWatchAccess.usageAccessIntent())
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("settings_error", e)
    }
  }

  @ReactMethod
  fun openNotificationSettings(promise: Promise) {
    try {
      ctx.startActivity(PaymentWatchAccess.notificationSettingsIntent(ctx))
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("settings_error", e)
    }
  }

  @ReactMethod
  fun setTargetPackages(packages: ReadableArray, promise: Promise) {
    val list = mutableListOf<String>()
    for (i in 0 until packages.size()) {
      packages.getString(i)?.let { list.add(it) }
    }
    PaymentWatchPrefs.setTargetPackages(ctx, list)
    if (PaymentWatchPrefs.isEnabled(ctx)) PaymentWatchService.start(ctx)
    promise.resolve(true)
  }

  @ReactMethod
  fun getTargetPackages(promise: Promise) {
    promise.resolve(Arguments.fromList(PaymentWatchPrefs.targetPackages(ctx).sorted()))
  }

  @ReactMethod
  fun getLaunchableApps(promise: Promise) {
    try {
      val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      @Suppress("DEPRECATION")
      val apps = ctx.packageManager.queryIntentActivities(launcherIntent, 0)
        .mapNotNull { info ->
          val packageName = info.activityInfo?.packageName ?: return@mapNotNull null
          if (packageName == ctx.packageName) return@mapNotNull null
          val label = info.loadLabel(ctx.packageManager)?.toString()?.trim().orEmpty()
          if (label.isEmpty()) return@mapNotNull null
          packageName to label
        }
        .distinctBy { it.first }
        .sortedBy { it.second.lowercase() }
      val result = Arguments.createArray()
      for ((packageName, label) in apps) {
        val row = Arguments.createMap()
        row.putString("packageName", packageName)
        row.putString("label", label)
        result.pushMap(row)
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("apps_error", e)
    }
  }

  @ReactMethod
  fun startIfEnabled(promise: Promise) {
    PaymentWatchService.start(ctx)
    promise.resolve(PaymentWatchPrefs.isEnabled(ctx) && PaymentWatchAccess.hasUsageAccess(ctx))
  }
}
