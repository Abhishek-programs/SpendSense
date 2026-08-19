package {{PACKAGE}}.paymentwatch

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.random.Random

object PaymentWatchDb {
  private const val TAG = "PaymentWatchDb"

  fun insertFlaggedExpense(context: Context, amount: Double, merchant: String): Boolean {
    val dbFile = File(context.filesDir, "SQLite/spendsense.db")
    if (!dbFile.exists()) {
      Log.w(TAG, "Database missing at ${dbFile.absolutePath}")
      return false
    }

    var db: SQLiteDatabase? = null
    return try {
      db = SQLiteDatabase.openDatabase(
        dbFile.absolutePath,
        null,
        SQLiteDatabase.OPEN_READWRITE or SQLiteDatabase.ENABLE_WRITE_AHEAD_LOGGING,
      )
      val bucketId = fallbackBucketId(db)
      val now = isoNow()
      val id = System.currentTimeMillis().toString(36) + Random.nextInt(0x100000).toString(36)
      db.execSQL(
        """
        INSERT INTO transactions (
          id, type, amount, merchant, description, bucket_id, date, source,
          remarks, funded_from_bucket_id, parsed_txn_id, is_flagged, is_recurring_draft, created_at
        ) VALUES (?, 'expense', ?, ?, NULL, ?, ?, 'notification', NULL, NULL, NULL, 1, 0, ?)
        """.trimIndent(),
        arrayOf(id, amount, merchant, bucketId, now, now),
      )
      true
    } catch (e: Exception) {
      Log.e(TAG, "Failed to insert payment", e)
      false
    } finally {
      db?.close()
    }
  }

  private fun fallbackBucketId(db: SQLiteDatabase): String {
    val cursor = db.rawQuery(
      "SELECT fallback_bucket_id FROM playbook LIMIT 1",
      null,
    )
    cursor.use {
      if (it.moveToFirst()) {
        val id = it.getString(0)
        if (!id.isNullOrBlank()) return id
      }
    }
    return "core-living"
  }

  private fun isoNow(): String {
    val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    fmt.timeZone = TimeZone.getTimeZone("UTC")
    return fmt.format(Date())
  }

  fun parseAmount(raw: String): Double? {
    val cleaned = raw
      .replace("NPR", "", ignoreCase = true)
      .replace("Rs.", "", ignoreCase = true)
      .replace("Rs", "", ignoreCase = true)
      .replace(",", "")
      .trim()
    val value = cleaned.toDoubleOrNull() ?: return null
    if (value <= 0) return null
    return value
  }
}
