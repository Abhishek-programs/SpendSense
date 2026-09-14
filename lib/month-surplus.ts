import { and, gte, lte } from 'drizzle-orm'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { buckets, lendBorrowEntries, playbook, transactions } from '@/db/schema'
import { currentMonthKey } from '@/lib/bucket-balance'
import { getMonthRange } from '@/lib/month'
import type { Bucket } from '@/store/buckets'
import type { Transaction } from '@/store/transactions'
import { computeMonthMetrics, type LendBorrowEntry } from '@/lib/lending/balance'

function getPreviousMonthRange(monthStartDay: number): { start: Date; end: Date } {
  const { start: currentStart } = getMonthRange(monthStartDay)
  const prevEnd = new Date(currentStart.getTime() - 1)
  const prevStart = new Date(
    currentStart.getFullYear(),
    currentStart.getMonth() - 1,
    monthStartDay,
    0,
    0,
    0,
    0,
  )
  return { start: prevStart, end: prevEnd }
}

export function computeMonthSurplus(
  monthlyIncome: number,
  activeBuckets: Bucket[],
  transactions: Transaction[],
  lendingCashAdjust = 0,
): number {
  const totalAllocations = activeBuckets.reduce((s, b) => s + b.monthlyAmount, 0)

  const regularSpending = activeBuckets.filter(b => b.type === 'spending' && !b.accumulates)
  const accumulating = activeBuckets.filter(b => b.type === 'spending' && b.accumulates)
  const lifestyleBudget = regularSpending.reduce((s, b) => s + b.monthlyAmount, 0)
  const personalTopUps = accumulating.reduce((s, b) => s + b.monthlyAmount, 0)
  const spendingPlan = lifestyleBudget + personalTopUps

  const lifestyleSpent = regularSpending.reduce((s, b) => {
    return (
      s +
      transactions
        .filter(
          t =>
            t.type === 'expense' &&
            !t.isFlagged &&
            !t.isRecurringDraft &&
            (t.bucketId === b.id ||
              (t.fundedFromBucketId === b.id && t.remarks === '__savings_confirm__')),
        )
        .reduce((sum, t) => sum + t.amount, 0)
    )
  }, 0)

  const personalDraws = accumulating.reduce((s, b) => {
    return (
      s +
      transactions
        .filter(
          t =>
            t.type === 'expense' &&
            !t.isFlagged &&
            !t.isRecurringDraft &&
            ((t.bucketId === b.id && (!t.remarks || !t.remarks.startsWith('__'))) ||
              (t.fundedFromBucketId === b.id && t.remarks === '__savings_confirm__')),
        )
        .reduce((sum, t) => sum + t.amount, 0)
    )
  }, 0)

  const salaryTransactions = transactions.filter(
    t =>
      t.type === 'income' &&
      t.remarks === '__salary__' &&
      !t.isRecurringDraft,
  )
  const hasSalary = salaryTransactions.length > 0
  const effectiveIncome = salaryTransactions.reduce((sum, t) => sum + t.amount, 0)
  const unallocated = Math.max(
    0,
    (effectiveIncome || monthlyIncome) - totalAllocations,
  )
  const fees = transactions
    .filter(t => t.type === 'expense' && !t.isFlagged && !t.isRecurringDraft)
    .reduce((sum, t) => sum + t.feeAmount, 0)
  const plannedSavings = activeBuckets
    .filter(b => b.type === 'savings' || b.type === 'investment')
    .reduce((sum, b) => sum + b.monthlyAmount, 0)
  const confirmedSavings = transactions
    .filter(
      t =>
        t.type === 'expense' &&
        t.remarks === '__savings_confirm__' &&
        !t.isFlagged &&
        !t.isRecurringDraft,
    )
    .reduce((sum, t) => sum + t.amount, 0)
  const stillInBank = hasSalary ? Math.max(0, plannedSavings - confirmedSavings) : 0
  const plannedLeftover = hasSalary
    ? spendingPlan - lifestyleSpent - personalDraws + unallocated
    : 0
  const monthLeftover = plannedLeftover + stillInBank + lendingCashAdjust - fees

  return monthLeftover
}

export async function runSurplusRollover(
  monthStartDay: number,
  lastSurplusRolloverMonth: string | null | undefined,
): Promise<string> {
  const monthKey = currentMonthKey(monthStartDay)
  if (lastSurplusRolloverMonth === monthKey) return monthKey

  const pbRows = await db.select().from(playbook).limit(1)
  if (pbRows.length === 0) return monthKey

  const pb = pbRows[0]
  const allBuckets = await db.select().from(buckets)
  const activeBuckets = allBuckets
    .filter(b => b.isActive)
    .map(b => ({
      id: b.id,
      name: b.name,
      type: b.type as Bucket['type'],
      monthlyAmount: b.monthlyAmount,
      color: b.color,
      icon: b.icon,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
      showOnHome: b.showOnHome,
      accumulates: b.accumulates ?? false,
      accumulationCap: b.accumulationCap ?? null,
    }))

  const { start, end } = getPreviousMonthRange(monthStartDay)
  const prevTxns = await db
    .select()
    .from(transactions)
    .where(and(gte(transactions.date, start.toISOString()), lte(transactions.date, end.toISOString())))

  const mappedTxns: Transaction[] = prevTxns.map(t => ({
    ...t,
    feeAmount: t.feeAmount ?? 0,
    merchant: t.merchant ?? null,
    remarks: t.remarks ?? null,
    parsedTxnId: t.parsedTxnId ?? null,
  }))

  const lendingRows = await db.select().from(lendBorrowEntries)
  const mappedLending: LendBorrowEntry[] = lendingRows.map(e => ({
    ...e,
    type: e.type as LendBorrowEntry['type'],
    note: e.note ?? null,
  }))
  const lendingCashAdjust = computeMonthMetrics(mappedLending, start, end).lendBorrowCashAdjust
  const surplus = computeMonthSurplus(
    pb.monthlyIncome,
    activeBuckets,
    mappedTxns,
    lendingCashAdjust,
  )

  const newCarry = Math.max(0, (pb.carriedForwardBalance ?? 0) + surplus)
  await db
    .update(playbook)
    .set({
      carriedForwardBalance: newCarry,
      lastSurplusRolloverMonth: monthKey,
    })
    .where(eq(playbook.id, pb.id))

  return monthKey
}
