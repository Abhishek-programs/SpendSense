package {{PACKAGE}}.paymentwatch

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.core.app.RemoteInput

class PaymentWatchReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != PaymentWatchService.ACTION_LOG) return
    val results = RemoteInput.getResultsFromIntent(intent) ?: return
    val raw = results.getCharSequence(PaymentWatchService.KEY_AMOUNT)?.toString().orEmpty()
    val amount = PaymentWatchDb.parseAmount(raw)
    if (amount == null) {
      Toast.makeText(context, "Enter a valid NPR amount", Toast.LENGTH_SHORT).show()
      PaymentWatchService.start(context)
      return
    }
    val pkg = intent.getStringExtra(PaymentWatchService.EXTRA_PACKAGE).orEmpty()
    val merchant = PaymentWatchPrefs.merchantLabel(pkg)
    val ok = PaymentWatchDb.insertFlaggedExpense(context, amount, merchant)
    Toast.makeText(
      context,
      if (ok) "Logged NPR ${amount.toInt()} — pick a category in SpendSense"
      else "Could not save. Open SpendSense once, then try again.",
      Toast.LENGTH_SHORT,
    ).show()
    PaymentWatchService.start(context)
  }
}

class PaymentWatchBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
      intent.action != Intent.ACTION_LOCKED_BOOT_COMPLETED
    ) {
      return
    }
    PaymentWatchService.start(context)
  }
}
