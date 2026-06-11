import type { Bucket } from '@/store/buckets'
import type { Goal } from '@/store/goals'
import type { PaymentMode } from '@/lib/goals/plan'
import { GOAL_BUCKET_LABELS } from '@/lib/goals/plan'

export interface FutureGoalGroup {
  goalId: string
  goalName: string
  paymentMode: PaymentMode
  buckets: Bucket[]
}

export function buildFutureGroups(
  savingsBuckets: Bucket[],
  goals: Goal[],
): { goalGroups: FutureGoalGroup[]; standaloneBuckets: Bucket[] } {
  const goalGroups: FutureGoalGroup[] = []
  const linkedIds = new Set<string>()

  for (const goal of goals.filter(g => g.isEnabled)) {
    const goalBuckets = savingsBuckets.filter(b => b.linkedGoalId === goal.id)
    if (goalBuckets.length === 0) continue
    goalBuckets.forEach(b => linkedIds.add(b.id))
    goalGroups.push({
      goalId: goal.id,
      goalName: goal.name,
      paymentMode: goal.paymentMode,
      buckets: goalBuckets,
    })
  }

  const standaloneBuckets = savingsBuckets.filter(b => !linkedIds.has(b.id))
  return { goalGroups, standaloneBuckets }
}

export function futureRowLabel(
  bucket: Bucket,
  goal?: Pick<Goal, 'name' | 'paymentMode'>,
): string {
  if (!goal) return bucket.name
  if (goal.paymentMode === 'pay_in_full' || bucket.goalBucketRole === 'full') {
    return `${goal.name} savings`
  }
  if (bucket.goalBucketRole === 'upfront' || bucket.goalBucketRole === 'emi_reserve') {
    return `${goal.name} — ${GOAL_BUCKET_LABELS[bucket.goalBucketRole].title}`
  }
  return bucket.name
}

export function checklistLabel(
  bucket: Bucket,
  goals: Goal[],
): string {
  const goal = goals.find(g => g.linkedBucketIds.includes(bucket.id))
  return futureRowLabel(bucket, goal)
}
