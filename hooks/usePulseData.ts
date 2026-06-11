import { usePlaybookStore } from '@/store/playbook'

import { useBucketsStore } from '@/store/buckets'

import { useTransactionsStore } from '@/store/transactions'

import { useGoalsStore } from '@/store/goals'

import { getMonthRange, getDaysRemaining } from '@/lib/month'

import { EF_BUCKET_ID } from '@/constants/defaults'



export function usePulseData() {

  const { monthStartDay, monthlyIncome, efStartBalance } = usePlaybookStore()

  const { buckets, bucketBalances } = useBucketsStore()

  const {

    flaggedTransactions,

    getTotalIncome,

    getSpentByBucket,

    getConfirmedSavingsBuckets,

    addTransaction,

    transactions,

  } = useTransactionsStore()

  const { goals } = useGoalsStore()



  const allSpendingBuckets = buckets.filter(b => b.type === 'spending')

  const allSavingsBuckets = buckets.filter(b => b.type === 'savings' || b.type === 'investment')



  const spendingBuckets = allSpendingBuckets.filter(b => b.isActive && b.showOnHome)

  const savingsBuckets = allSavingsBuckets.filter(b => b.isActive && b.showOnHome)



  const confirmedSavingIds = getConfirmedSavingsBuckets()

  const { start } = getMonthRange(monthStartDay)



  const spentByBucket: Record<string, number> = {}

  allSpendingBuckets.forEach(b => { spentByBucket[b.id] = getSpentByBucket(b.id) })



  const accumulatingBuckets = allSpendingBuckets.filter(b => b.isActive && b.accumulates)

  const regularSpendingBuckets = allSpendingBuckets.filter(b => b.isActive && !b.accumulates)



  const personalTopUps = accumulatingBuckets.reduce((s, b) => s + b.monthlyAmount, 0)

  const lifestyleBudget = regularSpendingBuckets.reduce((s, b) => s + b.monthlyAmount, 0)



  const totalIncome = getTotalIncome()

  const lifestyleSpent = regularSpendingBuckets.reduce(

    (s, b) => s + (spentByBucket[b.id] ?? 0),

    0,

  )

  const flaggedAmount = flaggedTransactions.reduce((s, t) => s + t.amount, 0)



  const plannedSavings = allSavingsBuckets

    .filter(b => b.isActive)

    .reduce((s, b) => s + b.monthlyAmount, 0)



  const savingsOnlyBuckets = allSavingsBuckets.filter(b => b.isActive && b.type === 'savings')

  const investmentBuckets = allSavingsBuckets.filter(b => b.isActive && b.type === 'investment')



  const plannedSavingsOnly = savingsOnlyBuckets.reduce((s, b) => s + b.monthlyAmount, 0)

  const plannedInvestment = investmentBuckets.reduce((s, b) => s + b.monthlyAmount, 0)



  const confirmedSavings = allSavingsBuckets

    .filter(b => b.isActive && confirmedSavingIds.has(b.id))

    .reduce((s, b) => s + b.monthlyAmount, 0)



  const confirmedSavingsOnly = savingsOnlyBuckets

    .filter(b => confirmedSavingIds.has(b.id))

    .reduce((s, b) => s + b.monthlyAmount, 0)



  const confirmedInvestment = investmentBuckets

    .filter(b => confirmedSavingIds.has(b.id))

    .reduce((s, b) => s + b.monthlyAmount, 0)



  const stillToSave = Math.max(0, plannedSavingsOnly - confirmedSavingsOnly)

  const stillToInvest = Math.max(0, plannedInvestment - confirmedInvestment)

  const unconfirmedSavings = Math.max(0, plannedSavings - confirmedSavings)



  const safeBeforeInvestments = totalIncome - lifestyleSpent - personalTopUps

  const actualSafeToSpend = totalIncome - lifestyleSpent - personalTopUps - plannedSavings

  const savingsSetAside = plannedSavings

  const available = actualSafeToSpend



  const totalSpent = lifestyleSpent

  const monthlySpendAllowance = lifestyleBudget + personalTopUps



  const daysRemaining = getDaysRemaining(monthStartDay)

  const weeksRemaining = Math.max(1, daysRemaining / 7)

  const weeklyRate = daysRemaining > 0 ? Math.max(0, actualSafeToSpend) / weeksRemaining : 0



  const totalInvested = transactions

    .filter(t => t.remarks === '__savings_confirm__')

    .reduce((sum, t) => sum + t.amount, 0)



  const efBucket = buckets.find(b => b.id === EF_BUCKET_ID)

  const efContributions = efBucket

    ? transactions

        .filter(t => t.bucketId === efBucket.id && t.remarks === '__savings_confirm__')

        .reduce((sum, t) => sum + t.amount, 0)

    : 0



  const goalBalances = goals.map(g => {

    const current = transactions

      .filter(t => g.linkedBucketIds.includes(t.bucketId) && t.remarks === '__savings_confirm__')

      .reduce((sum, t) => sum + t.amount, 0)

    return { name: g.name, value: g.startBalance + current }

  })



  const efValue = efStartBalance + efContributions

  const assetBreakdown = [

    ...(efValue > 0 || efStartBalance > 0 ? [{ name: 'Emergency Fund', value: efValue }] : []),

    ...goalBalances,

  ]



  const totalAssets = assetBreakdown.reduce((sum, g) => sum + g.value, 0)

  const totalLiabilities = 0

  const netWorth = totalAssets - totalLiabilities

  const monthGrowth = confirmedSavings

  const savingsRate = totalIncome > 0 ? (confirmedSavings / totalIncome) * 100 : 0



  const hasAnyData = totalAssets > 0 || transactions.length > 0



  return {

    totalIncome,

    available,

    actualSafeToSpend,

    safeBeforeInvestments,

    plannedSavings,

    plannedSavingsOnly,

    plannedInvestment,

    savingsSetAside,

    flaggedAmount,

    unconfirmedSavings,

    stillToSave,

    stillToInvest,

    confirmedSavings,

    confirmedSavingsOnly,

    confirmedInvestment,

    daysRemaining,

    weeklyRate,

    totalSpent,

    lifestyleSpent,

    lifestyleBudget,

    monthlySpendAllowance,

    personalTopUps,

    totalInvested,

    spendingBuckets,

    savingsBuckets,

    spentByBucket,

    bucketBalances,

    confirmedSavingIds,

    monthStart: start,

    addTransaction,

    netWorth,

    monthGrowth,

    totalAssets,

    totalLiabilities,

    savingsRate,

    assetBreakdown,

    hasAnyData,

    efValue,

    efStartBalance,

  }

}


