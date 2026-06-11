package com.anonymous.SpendSense.overlay

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

object OverlayModuleHolder {
  @Volatile
  var mediaProjection: android.media.projection.MediaProjection? = null
}

class OverlayModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext),
  ActivityEventListener {

  private var mediaProjectionPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
    OcrResultBridge.reactContext = reactContext
  }

  override fun getName(): String = "OverlayModule"

  @ReactMethod
  fun startOverlay(promise: Promise) {
    if (!Settings.canDrawOverlays(reactContext)) {
      promise.reject("PERMISSION_DENIED", "Overlay permission not granted")
      return
    }
    if (OverlayModuleHolder.mediaProjection == null) {
      promise.reject("NO_MEDIA_PROJECTION", "Screen capture permission not granted")
      return
    }

    val intent = Intent(reactContext, OverlayService::class.java).apply {
      action = OverlayService.ACTION_START
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      reactContext.startForegroundService(intent)
    } else {
      reactContext.startService(intent)
    }
    promise.resolve(true)
  }

  @ReactMethod
  fun stopOverlay(promise: Promise) {
    val intent = Intent(reactContext, OverlayService::class.java).apply {
      action = OverlayService.ACTION_STOP
    }
    reactContext.startService(intent)
    promise.resolve(true)
  }

  @ReactMethod
  fun requestOverlayPermission() {
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${reactContext.packageName}"),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun requestMediaProjectionPermission() {
    val activity = reactContext.currentActivity ?: return
    val mgr = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    activity.startActivityForResult(mgr.createScreenCaptureIntent(), REQUEST_MEDIA_PROJECTION)
  }

  @ReactMethod
  fun isOverlayPermissionGranted(promise: Promise) {
    promise.resolve(Settings.canDrawOverlays(reactContext))
  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) {
    if (requestCode != REQUEST_MEDIA_PROJECTION) return
    if (resultCode != Activity.RESULT_OK || data == null) return

    val mgr = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    OverlayModuleHolder.mediaProjection?.stop()
    OverlayModuleHolder.mediaProjection = mgr.getMediaProjection(resultCode, data)
    mediaProjectionPromise?.resolve(true)
    mediaProjectionPromise = null
  }

  override fun onNewIntent(intent: Intent) {}

  companion object {
    private const val REQUEST_MEDIA_PROJECTION = 9102
  }
}
