package com.screenshotbubble

import android.content.Context
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.view.WindowManager
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.io.FileOutputStream
import kotlin.coroutines.resume

object ScreenCaptureHelper {

  suspend fun captureToCache(
    context: Context,
    mediaProjection: MediaProjection,
    windowManager: WindowManager,
  ): String? {
    val metrics = context.resources.displayMetrics
    val width = metrics.widthPixels
    val height = metrics.heightPixels
    val density = metrics.densityDpi

    val reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 1)
    var virtualDisplay: VirtualDisplay? = null

    return try {
      virtualDisplay = mediaProjection.createVirtualDisplay(
        "SpendSenseBubbleCapture",
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

      bitmap?.let { saveBitmapToCache(context, it) }
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

    return if (rowPadding == 0) {
      bitmap
    } else {
      Bitmap.createBitmap(bitmap, 0, 0, width, height).also {
        if (!bitmap.isRecycled) bitmap.recycle()
      }
    }
  }

  private fun saveBitmapToCache(context: Context, bitmap: Bitmap): String? {
    val file = File(context.cacheDir, "bubble_capture_${System.currentTimeMillis()}.jpg")
    return try {
      FileOutputStream(file).use { out ->
        bitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
        out.flush()
      }
      file.absolutePath
    } catch (_: Exception) {
      if (file.exists()) file.delete()
      null
    } finally {
      if (!bitmap.isRecycled) bitmap.recycle()
    }
  }
}
