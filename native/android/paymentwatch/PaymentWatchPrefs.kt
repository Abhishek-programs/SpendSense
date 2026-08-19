package {{PACKAGE}}.paymentwatch

import android.content.Context

object PaymentWatchPrefs {
  private const val PREFS = "payment_watch"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_PACKAGES = "packages"

  const val DEFAULT_PACKAGES = "com.f1soft.esewa,com.esewa,com.f1soft.nabilmbank"

  fun isEnabled(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)

  fun setEnabled(context: Context, enabled: Boolean) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_ENABLED, enabled)
      .apply()
  }

  fun targetPackages(context: Context): Set<String> {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getString(KEY_PACKAGES, DEFAULT_PACKAGES) ?: DEFAULT_PACKAGES
    return raw.split(",").map { it.trim() }.filter { it.isNotEmpty() }.toSet()
  }

  fun setTargetPackages(context: Context, packages: List<String>) {
    val joined = packages.map { it.trim() }.filter { it.isNotEmpty() }.joinToString(",")
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_PACKAGES, if (joined.isEmpty()) DEFAULT_PACKAGES else joined)
      .apply()
  }

  fun merchantLabel(packageName: String): String {
    return when (packageName) {
      "com.f1soft.esewa", "com.esewa" -> "eSewa"
      "com.f1soft.nabilmbank" -> "nBank"
      else -> packageName.substringAfterLast('.').replaceFirstChar { it.uppercase() }
    }
  }
}
