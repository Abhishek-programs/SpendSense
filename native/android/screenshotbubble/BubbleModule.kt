package com.screenshotbubble

import android.app.Activity
import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class BubbleModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var projectionResultCode: Int = Activity.RESULT_CANCELED
  private var projectionData: Intent? = null
  private var mediaProjectionPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "BubbleModule"

  @ReactMethod
  fun checkUsagePermission(promise: Promise) {
    promise.resolve(isUsageAccessGranted())
  }

  @ReactMethod
  fun requestUsagePermission() {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun checkOverlayPermission(promise: Promise) {
    promise.resolve(Settings.canDrawOverlays(reactContext))
  }

  @ReactMethod
  fun requestOverlayPermission() {
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${reactContext.packageName}"),
    ).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun requestMediaProjectionPermission(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No active activity for screen capture permission")
      return
    }

    mediaProjectionPromise = promise
    val mgr = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    activity.startActivityForResult(mgr.createScreenCaptureIntent(), REQUEST_MEDIA_PROJECTION)
  }

  @ReactMethod
  fun startBubble(resultCode: Int, targetApps: ReadableArray, promise: Promise) {
    if (!Settings.canDrawOverlays(reactContext)) {
      promise.reject("PERMISSION_DENIED", "Overlay permission not granted")
      return
    }

    if (!isUsageAccessGranted()) {
      promise.reject("USAGE_PERMISSION_DENIED", "App usage access not granted")
      return
    }

    var effectiveResultCode = projectionResultCode
    val effectiveProjectionData = projectionData

    if (resultCode != Activity.RESULT_CANCELED && resultCode != 0) {
      effectiveResultCode = resultCode
    }

    if (effectiveResultCode != Activity.RESULT_OK || effectiveProjectionData == null) {
      promise.reject("NO_MEDIA_PROJECTION", "Screen capture permission not granted")
      return
    }

    val whitelist = readableArrayToList(targetApps).apply {
      val ownPackage = reactContext.packageName
      if (!contains(ownPackage)) add(ownPackage)
    }

    val serviceIntent = Intent(reactContext, ScreenshotBubbleService::class.java).apply {
      action = ScreenshotBubbleService.ACTION_START
      putExtra(ScreenshotBubbleService.EXTRA_RESULT_CODE, effectiveResultCode)
      putExtra(ScreenshotBubbleService.EXTRA_PROJECTION_DATA, effectiveProjectionData)
      putStringArrayListExtra(ScreenshotBubbleService.EXTRA_WHITELIST, whitelist)
      putExtra(ScreenshotBubbleService.EXTRA_OWN_PACKAGE, reactContext.packageName)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      reactContext.startForegroundService(serviceIntent)
    } else {
      reactContext.startService(serviceIntent)
    }

    promise.resolve(true)
  }

  @ReactMethod
  fun stopBubble(promise: Promise) {
    val intent = Intent(reactContext, ScreenshotBubbleService::class.java).apply {
      action = ScreenshotBubbleService.ACTION_STOP
    }
    reactContext.startService(intent)
    promise.resolve(true)
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_MEDIA_PROJECTION) return

    projectionResultCode = resultCode
    projectionData = data?.let { Intent(it) }

    mediaProjectionPromise?.let { promise ->
      if (resultCode == Activity.RESULT_OK && data != null) {
        promise.resolve(true)
      } else {
        promise.reject("CANCELLED", "Screen capture permission denied")
      }
      mediaProjectionPromise = null
    }
  }

  override fun onNewIntent(intent: Intent) {}

  private fun isUsageAccessGranted(): Boolean {
    val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
    val mode = appOps.checkOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      Process.myUid(),
      reactContext.packageName,
    )
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun readableArrayToList(array: ReadableArray?): ArrayList<String> {
    val list = ArrayList<String>()
    if (array == null) return list
    for (i in 0 until array.size()) {
      array.getString(i)?.takeIf { it.isNotEmpty() }?.let { list.add(it) }
    }
    return list
  }

  companion object {
    private const val REQUEST_MEDIA_PROJECTION = 9102
  }
}
