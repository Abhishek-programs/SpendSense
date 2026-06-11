package com.anonymous.SpendSense.overlay

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.modules.core.DeviceEventManagerModule

class OcrResultBridge(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "OcrResultBridge"

  companion object {
    @Volatile
    var reactContext: ReactApplicationContext? = null

    fun emitResult(rawText: String) {
      val ctx = reactContext ?: return
      val payload = Arguments.createMap().apply {
        putString("rawText", rawText)
        putDouble("timestamp", System.currentTimeMillis().toDouble())
      }
      ctx
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("onOcrResult", payload)
    }
  }
}
