import {
  CORE_LIVING_BUCKET_ID,
  DATES_BUCKET_ID,
  FUN_BUCKET_ID,
  MISC_BUCKET_ID,
} from '@/constants/defaults'
import type { Bucket } from '@/store/buckets'

/** Fixed cut weights among Living ceilings (renormalized to victims). */
export const LIVING_CUT_WEIGHTS: Record<string, number> = {
  [FUN_BUCKET_ID]: 0.5,
  [DATES_BUCKET_ID]: 0.2,
  [MISC_BUCKET_ID]: 0.2,
  [CORE_LIVING_BUCKET_ID]: 0.1,
}

export function livingOvershoot(
  bucket: Bucket,
  spent: number,
): number {
  if (bucket.accumulates) return 0
  return Math.max(0, spent - bucket.monthlyAmount)
}

export function totalLivingOvershoot(
  regularBuckets: Bucket[],
  spentByBucket: Record<string, number>,
): number {
  return regularBuckets.reduce(
    (sum, b) => sum + livingOvershoot(b, spentByBucket[b.id] ?? 0),
    0,
  )
}

/**
 * priorityOrder: high → low (index 0 = protect first).
 * Cuts only buckets ranked below the first overspent bucket; skips overspent ids.
 * Returns map of bucketId → new monthlyAmount.
 */
export function computeCeilingCuts(
  priorityOrder: string[],
  regularBuckets: Bucket[],
  spentByBucket: Record<string, number>,
): { cuts: Record<string, number>; totalCut: number } {
  const byId = Object.fromEntries(regularBuckets.map(b => [b.id, b]))
  const overspentIds = new Set(
    regularBuckets
      .filter(b => livingOvershoot(b, spentByBucket[b.id] ?? 0) > 0)
      .map(b => b.id),
  )
  const totalCut = totalLivingOvershoot(regularBuckets, spentByBucket)
  if (totalCut <= 0 || overspentIds.size === 0) {
    return { cuts: {}, totalCut: 0 }
  }

  const firstOverIdx = priorityOrder.findIndex(id => overspentIds.has(id))
  if (firstOverIdx < 0) return { cuts: {}, totalCut: 0 }

  const victimIds = priorityOrder
    .slice(firstOverIdx + 1)
    .filter(id => byId[id] && !overspentIds.has(id))

  if (victimIds.length === 0) return { cuts: {}, totalCut: 0 }

  let weightSum = 0
  const weights: Record<string, number> = {}
  for (const id of victimIds) {
    const w = LIVING_CUT_WEIGHTS[id] ?? 0
    weights[id] = w
    weightSum += w
  }
  // Custom buckets with no weight: share residual equally if all known weights missing
  if (weightSum <= 0) {
    const eq = 1 / victimIds.length
    for (const id of victimIds) weights[id] = eq
    weightSum = 1
  }

  const cuts: Record<string, number> = {}
  let allocated = 0
  victimIds.forEach((id, i) => {
    const bucket = byId[id]
    const share =
      i === victimIds.length - 1
        ? totalCut - allocated
        : Math.round(((totalCut * weights[id]) / weightSum) * 1000) / 1000
    allocated += share
    const next = Math.max(0, Math.round((bucket.monthlyAmount - share) * 1000) / 1000)
    cuts[id] = next
  })

  return { cuts, totalCut }
}
