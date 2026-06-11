import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { bucketBalances, buckets } from '@/db/schema'
import { getMonthRange } from '@/lib/month'
import type { Bucket } from '@/store/buckets'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function currentMonthKey(monthStartDay: number): string {
  const { start } = getMonthRange(monthStartDay)
  return start.toISOString().slice(0, 7)
}

export async function getBucketBalance(bucketId: string): Promise<number> {
  const row = await db
    .select()
    .from(bucketBalances)
    .where(eq(bucketBalances.bucketId, bucketId))
    .limit(1)
  return row[0]?.balance ?? 0
}

export async function setBucketBalance(bucketId: string, balance: number): Promise<void> {
  const now = new Date().toISOString()
  const existing = await db
    .select()
    .from(bucketBalances)
    .where(eq(bucketBalances.bucketId, bucketId))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(bucketBalances)
      .set({ balance: Math.max(0, balance), updatedAt: now })
      .where(eq(bucketBalances.bucketId, bucketId))
  } else {
    await db.insert(bucketBalances).values({
      id: generateId(),
      bucketId,
      balance: Math.max(0, balance),
      updatedAt: now,
    })
  }
}

export async function loadAllBucketBalances(): Promise<Record<string, number>> {
  const rows = await db.select().from(bucketBalances)
  const map: Record<string, number> = {}
  for (const row of rows) {
    map[row.bucketId] = row.balance
  }
  return map
}

export async function deductFromAccumulatingBucket(
  bucketId: string,
  amount: number,
): Promise<{ newBalance: number; overspent: number }> {
  const current = await getBucketBalance(bucketId)
  const newBalance = Math.max(0, current - amount)
  const overspent = Math.max(0, amount - current)
  await setBucketBalance(bucketId, newBalance)
  return { newBalance, overspent }
}

export async function restoreToAccumulatingBucket(
  bucketId: string,
  amount: number,
  cap: number | null | undefined,
): Promise<void> {
  const current = await getBucketBalance(bucketId)
  let next = current + amount
  if (cap != null && cap > 0) {
    next = Math.min(next, cap)
  }
  await setBucketBalance(bucketId, next)
}

export async function applyTopUp(bucket: Bucket): Promise<number> {
  const current = await getBucketBalance(bucket.id)
  if (bucket.accumulationCap != null && current >= bucket.accumulationCap) {
    return current
  }
  let next = current + bucket.monthlyAmount
  if (bucket.accumulationCap != null && bucket.accumulationCap > 0) {
    next = Math.min(next, bucket.accumulationCap)
  }
  await setBucketBalance(bucket.id, next)
  return next
}

export async function ensureBalanceRow(bucketId: string): Promise<void> {
  const existing = await getBucketBalance(bucketId)
  if (existing === 0) {
    const row = await db
      .select()
      .from(bucketBalances)
      .where(eq(bucketBalances.bucketId, bucketId))
      .limit(1)
    if (row.length === 0) {
      await setBucketBalance(bucketId, 0)
    }
  }
}

export async function runMonthRollover(
  monthStartDay: number,
  lastRolloverMonth: string | null | undefined,
): Promise<string> {
  const monthKey = currentMonthKey(monthStartDay)
  if (lastRolloverMonth === monthKey) return monthKey

  const allBuckets = await db.select().from(buckets)
  for (const bucket of allBuckets) {
    if (!bucket.accumulates || !bucket.isActive) continue
    await ensureBalanceRow(bucket.id)
    await applyTopUp({
      id: bucket.id,
      name: bucket.name,
      type: bucket.type as Bucket['type'],
      monthlyAmount: bucket.monthlyAmount,
      color: bucket.color,
      icon: bucket.icon,
      sortOrder: bucket.sortOrder,
      isActive: bucket.isActive,
      showOnHome: bucket.showOnHome,
      accumulates: true,
      accumulationCap: bucket.accumulationCap ?? null,
    })
  }

  return monthKey
}

export function isAccumulatingExpense(remarks: string | null | undefined): boolean {
  if (!remarks) return true
  return !remarks.startsWith('__')
}
