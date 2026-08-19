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
  private const val MAX_CHIPS = 8

  fun insertFlaggedExpense(
    context: Context,
    amount: Double,
    merchant: String,
    description: String?,
  ): String? {
    val dbFile = File(context.filesDir, "SQLite/spendsense.db")
    if (!dbFile.exists()) {
      Log.w(TAG, "Database missing at ${dbFile.absolutePath}")
      return null
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
        ) VALUES (?, 'expense', ?, ?, ?, ?, ?, 'notification', NULL, NULL, NULL, 1, 0, ?)
        """.trimIndent(),
        arrayOf(id, amount, merchant, description, bucketId, now, now),
      )
      id
    } catch (e: Exception) {
      Log.e(TAG, "Failed to insert payment", e)
      null
    } finally {
      db?.close()
    }
  }

  fun assignSpendingBucket(context: Context, txnId: String, bucketHint: String): String? {
    val dbFile = File(context.filesDir, "SQLite/spendsense.db")
    if (!dbFile.exists()) return null
    var db: SQLiteDatabase? = null
    return try {
      db = SQLiteDatabase.openDatabase(
        dbFile.absolutePath,
        null,
        SQLiteDatabase.OPEN_READWRITE or SQLiteDatabase.ENABLE_WRITE_AHEAD_LOGGING,
      )
      val hit = resolveSpendingBucket(db, bucketHint) ?: return null
      db.execSQL(
        "UPDATE transactions SET bucket_id = ?, is_flagged = 0 WHERE id = ?",
        arrayOf(hit.id, txnId),
      )
      hit.name
    } catch (e: Exception) {
      Log.e(TAG, "Failed to assign bucket", e)
      null
    } finally {
      db?.close()
    }
  }

  fun spendingBucketNames(context: Context): Array<String> {
    val dbFile = File(context.filesDir, "SQLite/spendsense.db")
    if (!dbFile.exists()) return emptyArray()
    var db: SQLiteDatabase? = null
    return try {
      db = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
      loadSpendingBuckets(db).map { it.name }.take(MAX_CHIPS).toTypedArray()
    } catch (e: Exception) {
      Log.e(TAG, "Failed to load buckets", e)
      emptyArray()
    } finally {
      db?.close()
    }
  }

  private data class BucketRow(val id: String, val name: String)

  private fun loadSpendingBuckets(db: SQLiteDatabase): List<BucketRow> {
    val cursor = db.rawQuery(
      """
      SELECT id, name FROM buckets
      WHERE is_active = 1 AND type = 'spending'
      ORDER BY sort_order ASC
      """.trimIndent(),
      null,
    )
    val rows = mutableListOf<BucketRow>()
    cursor.use {
      while (it.moveToNext()) {
        val id = it.getString(0) ?: continue
        val name = it.getString(1) ?: continue
        if (name.isNotBlank()) rows.add(BucketRow(id, name))
      }
    }
    return rows
  }

  private fun resolveSpendingBucket(db: SQLiteDatabase, raw: String?): BucketRow? {
    val q = raw?.trim().orEmpty()
    if (q.isEmpty()) return null
    val rows = loadSpendingBuckets(db)
    rows.firstOrNull { it.name.equals(q, ignoreCase = true) }?.let { return it }
    val prefix = rows.filter { it.name.startsWith(q, ignoreCase = true) }
    return prefix.singleOrNull()
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

  data class ParsedLog(val amount: Double, val label: String?)

  fun parseLogInput(raw: String): ParsedLog? {
    val trimmed = raw.trim()
    if (trimmed.isEmpty()) return null
    val parts = trimmed.split(Regex("\\s+"), limit = 2)
    val amount = parseAmount(parts[0]) ?: return null
    val label = parts.getOrNull(1)?.trim()?.takeIf { it.isNotEmpty() }
    return ParsedLog(amount, label)
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
