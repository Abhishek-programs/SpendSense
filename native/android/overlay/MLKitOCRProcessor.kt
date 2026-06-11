package com.anonymous.SpendSense.overlay

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.tasks.await

class MLKitOCRProcessor {
  private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

  suspend fun process(bitmap: Bitmap): String {
    val image = InputImage.fromBitmap(bitmap, 0)
    val result = recognizer.process(image).await()
    return result.text.orEmpty()
  }

  fun close() {
    recognizer.close()
  }
}
