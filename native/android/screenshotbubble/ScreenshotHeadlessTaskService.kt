package com.screenshotbubble

import android.content.Intent
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class ScreenshotHeadlessTaskService : HeadlessJsTaskService() {

  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras: Bundle = intent?.extras ?: return null
    if (!extras.containsKey(EXTRA_SCREENSHOT_PATH)) return null

    val data = Arguments.createMap().apply {
      putString("screenshotPath", extras.getString(EXTRA_SCREENSHOT_PATH))
    }

    return HeadlessJsTaskConfig(
      "ScreenshotTask",
      data,
      120_000,
      true,
    )
  }

  companion object {
    const val EXTRA_SCREENSHOT_PATH = "screenshotPath"
  }
}
