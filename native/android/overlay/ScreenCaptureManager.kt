package com.anonymous.SpendSense.overlay

import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.view.WindowManager
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

class ScreenCaptureManager(
  private val context: android.content.Context,
  private val mediaProjection: MediaProjection,
  private val windowManager: WindowManager,
) {

  suspend fun capture(): Bitmap? {
    val metrics = context.resources.displayMetrics
    val width = metrics.widthPixels
    val height = metrics.heightPixels
    val density = metrics.densityDpi

    val reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 1)
    var virtualDisplay: VirtualDisplay? = null

    return try {
      virtualDisplay = mediaProjection.createVirtualDisplay(
        "SpendSenseCapture",
        width,
        height,
        density,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
        reader.surface,
        null,
        null,
      )

      val image = awaitImage(reader) ?: return null
      val bitmap = imageToBitmap(image, width, height)
      image.close()
      bitmap
    } finally {
      virtualDisplay?.release()
      reader.close()
    }
  }

  private suspend fun awaitImage(reader: ImageReader): Image? =
    suspendCancellableCoroutine { cont ->
      reader.setOnImageAvailableListener({ r ->
        val image = r.acquireLatestImage()
        if (cont.isActive) {
          cont.resume(image)
        } else {
          image?.close()
        }
      }, null)
    }

  private fun imageToBitmap(image: Image, width: Int, height: Int): Bitmap? {
    val plane = image.planes.firstOrNull() ?: return null
    val buffer = plane.buffer
    val pixelStride = plane.pixelStride
    val rowStride = plane.rowStride
    val rowPadding = rowStride - pixelStride * width

    val bitmap = Bitmap.createBitmap(
      width + rowPadding / pixelStride,
      height,
      Bitmap.Config.ARGB_8888,
    )
    bitmap.copyPixelsFromBuffer(buffer)
    return Bitmap.createBitmap(bitmap, 0, 0, width, height)
  }
}
