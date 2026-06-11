import { useEffect } from 'react'
import { Platform, ToastAndroid } from 'react-native'
import { Overlay, isOverlayAvailable } from '@/lib/overlay'
import { parseOcrText, validateReceipt } from '@/lib/ocr'
import { categorize } from '@/lib/categorize'
import { useTransactionsStore } from '@/store/transactions'
import { useBucketsStore } from '@/store/buckets'
import { usePlaybookStore } from '@/store/playbook'

export function useOverlay() {
  const { addTransaction } = useTransactionsStore()
  const { keywordMappings, sureShotMerchants, isLoaded: bucketsLoaded } = useBucketsStore()
  const { fallbackBucketId, isOnboarded } = usePlaybookStore()

  useEffect(() => {
    if (!isOverlayAvailable() || !bucketsLoaded || !isOnboarded) return

    const sub = Overlay.onOcrResult(async ({ rawText, timestamp }) => {
      try {
        if (!validateReceipt(rawText)) {
          ToastAndroid.show('Could not read transaction', ToastAndroid.SHORT)
          return
        }

        const parsed = parseOcrText(rawText)
        if (!parsed.amount) {
          ToastAndroid.show('Could not read transaction', ToastAndroid.SHORT)
          return
        }

        const { bucketId, isFlagged } = categorize({
          remarks: parsed.remarks,
          merchant: parsed.merchant,
          keywords: keywordMappings.map(k => ({ keyword: k.keyword, bucketId: k.bucketId })),
          sureShotMerchants: sureShotMerchants.map(m => ({ merchantName: m.merchantName, bucketId: m.bucketId })),
          fallbackBucketId: fallbackBucketId ?? '',
        })

        await addTransaction({
          type: 'expense',
          amount: parsed.amount,
          merchant: parsed.merchant,
          bucketId,
          date: new Date(timestamp).toISOString(),
          source: 'overlay',
          remarks: parsed.remarks,
          parsedTxnId: parsed.txnId,
          isFlagged,
          isRecurringDraft: false,
        }).then(({ overspent }) => {
          if (overspent) {
            ToastAndroid.show(
              `Personal fund empty — NPR ${overspent} overspent`,
              ToastAndroid.SHORT,
            )
          }
        })

        const msg = isFlagged
          ? `NPR ${parsed.amount} saved — needs review`
          : `NPR ${parsed.amount} saved`
        ToastAndroid.show(msg, ToastAndroid.SHORT)
      } catch {
        ToastAndroid.show('Overlay capture failed', ToastAndroid.SHORT)
      }
    })

    return () => sub.remove()
  }, [bucketsLoaded, isOnboarded, keywordMappings, sureShotMerchants, fallbackBucketId, addTransaction])
}
