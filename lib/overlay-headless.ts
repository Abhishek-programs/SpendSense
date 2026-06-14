import { Platform, ToastAndroid } from 'react-native'
import { runMigrations } from '@/db/client'
import { seedDefaults } from '@/db/seed'
import { processReceiptImage } from '@/lib/ocr'
import { categorize } from '@/lib/categorize'
import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'

function toFileUri(screenshotPath: string): string {
  if (screenshotPath.startsWith('file://')) {
    return screenshotPath
  }
  return `file://${screenshotPath}`
}

export async function runScreenshotHeadlessTask(screenshotPath: string): Promise<void> {
  if (Platform.OS !== 'android' || !screenshotPath) {
    return
  }

  await runMigrations()
  await seedDefaults()
  await usePlaybookStore.getState().loadPlaybook()
  await useBucketsStore.getState().loadBuckets()

  const { fallbackBucketId, isOnboarded } = usePlaybookStore.getState()
  if (!isOnboarded || !fallbackBucketId) {
    return
  }

  const { keywordMappings, sureShotMerchants } = useBucketsStore.getState()
  const parsed = await processReceiptImage(toFileUri(screenshotPath))

  if (!parsed?.amount) {
    ToastAndroid.show('Could not read transaction', ToastAndroid.SHORT)
    return
  }

  const { bucketId, isFlagged } = categorize({
    description: null,
    remarks: parsed.remarks,
    merchant: parsed.merchant,
    keywords: keywordMappings.map(k => ({ keyword: k.keyword, bucketId: k.bucketId })),
    sureShotMerchants: sureShotMerchants.map(m => ({
      merchantName: m.merchantName,
      bucketId: m.bucketId,
    })),
    fallbackBucketId,
  })

  await useTransactionsStore.getState().addTransaction({
    type: 'expense',
    amount: parsed.amount,
    description: null,
    merchant: parsed.merchant,
    bucketId,
    date: new Date().toISOString(),
    source: 'overlay',
    remarks: parsed.remarks ?? parsed.merchant ?? null,
    parsedTxnId: parsed.txnId,
    isFlagged,
    isRecurringDraft: false,
  })

  const msg = isFlagged
    ? `NPR ${parsed.amount} saved — needs review`
    : `NPR ${parsed.amount} saved`
  ToastAndroid.show(msg, ToastAndroid.SHORT)
}
