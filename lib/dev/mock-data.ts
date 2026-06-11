import { useTransactionsStore, INCOME_BUCKET_ID } from '@/store/transactions'
import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import mockDataFixture from './mock-data.json'

export interface MockMonthData {
  month: string
  salary?: boolean
  expenses?: {
    amount: number
    bucketId: string
    merchant?: string
    remarks?: string
    date?: string
  }[]
  savingsConfirmed?: {
    bucketId: string
    amount?: number
  }[]
}

export interface MockDataPayload {
  months: MockMonthData[]
  advanceToMonth?: string
}

function monthStartDate(monthKey: string, day: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, day).toISOString()
}

export async function injectMockData(payload: MockDataPayload): Promise<number> {
  const { addTransaction } = useTransactionsStore.getState()
  const { monthlyIncome, monthStartDay, updatePlaybook } = usePlaybookStore.getState()
  const { buckets } = useBucketsStore.getState()

  let inserted = 0

  for (const monthData of payload.months) {
    const baseDate = monthStartDate(monthData.month, monthStartDay)

    if (monthData.salary) {
      await addTransaction({
        type: 'income',
        amount: monthlyIncome,
        merchant: 'Salary',
        bucketId: INCOME_BUCKET_ID,
        date: baseDate,
        source: 'manual',
        remarks: '__salary__',
        parsedTxnId: null,
        isFlagged: false,
        isRecurringDraft: false,
      })
      inserted++
    }

    for (const exp of monthData.expenses ?? []) {
      const bucket = buckets.find(b => b.id === exp.bucketId)
      if (!bucket) continue
      await addTransaction({
        type: 'expense',
        amount: exp.amount,
        merchant: exp.merchant ?? 'Mock expense',
        bucketId: exp.bucketId,
        date: exp.date ?? baseDate,
        source: 'manual',
        remarks: exp.remarks ?? null,
        parsedTxnId: null,
        isFlagged: false,
        isRecurringDraft: false,
      })
      inserted++
    }

    for (const saving of monthData.savingsConfirmed ?? []) {
      const bucket = buckets.find(b => b.id === saving.bucketId)
      if (!bucket) continue
      await addTransaction({
        type: 'expense',
        amount: saving.amount ?? bucket.monthlyAmount,
        merchant: bucket.name,
        bucketId: saving.bucketId,
        date: baseDate,
        source: 'manual',
        remarks: '__savings_confirm__',
        parsedTxnId: null,
        isFlagged: false,
        isRecurringDraft: false,
      })
      inserted++
    }
  }

  if (payload.advanceToMonth) {
    await updatePlaybook({ lastChecklistMonth: payload.advanceToMonth })
  }

  return inserted
}

export function validateMockDataPayload(data: unknown): MockDataPayload {
  const parsed = data as MockDataPayload
  if (!parsed?.months || !Array.isArray(parsed.months)) {
    throw new Error('Invalid format: expected { months: [...] }')
  }
  return parsed
}

/** Dev fixture — edit lib/dev/mock-data.json in the repo. */
export function getDevMockDataPayload(): MockDataPayload {
  return validateMockDataPayload(mockDataFixture)
}
